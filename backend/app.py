from flask import (
    Flask,
    request,
    render_template,
    make_response,
    redirect,
    url_for,
    flash,
    send_file,
    Response,
    jsonify,
    send_from_directory,
)
import requests
import xml.etree.ElementTree as ET
from datetime import datetime
import re
import os
import json
import tempfile
from dotenv import load_dotenv
import urllib.parse
import subprocess
import threading
import shutil
from werkzeug.serving import run_simple
import hashlib
import logging
from flask_sqlalchemy import SQLAlchemy
from datetime import timedelta
from flask_cors import CORS

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()  # Cargar variables de entorno desde archivo .env

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(
    app,
    resources={
        r"/*": {
            "origins": [os.getenv("CORS_ORIGIN", "http://localhost:5173"), "http://127.0.0.1:5000", "http://localhost:5000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type"],
        }
    },
)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-key")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

# Configuración de base de datos (SQLite)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///podcasts.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# Crear directorio para almacenar archivos de audio
AUDIO_CACHE_DIR = os.path.join(os.getcwd(), "audio_cache")
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)


# Modelo de base de datos para almacenar feeds
class PodcastFeed(db.Model):
    print('hola2')
    id = db.Column(db.String(64), primary_key=True)  # hash del URL del canal
    channel_id = db.Column(db.String(100), nullable=False)
    channel_title = db.Column(db.String(200), nullable=False)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    rss_content = db.Column(db.Text, nullable=True)  # Contenido cacheado


# Modelo para videos cacheados
class CachedVideo(db.Model):
    id = db.Column(db.String(64), primary_key=True)  # ID del video de YouTube
    title = db.Column(db.String(200), nullable=False)
    audio_path = db.Column(db.String(255), nullable=True)  # Ruta al archivo de audio
    last_accessed = db.Column(db.DateTime, default=datetime.utcnow)
    file_size = db.Column(db.Integer, default=0)  # Tamaño en bytes
    duration = db.Column(db.String(20), default="00:00")  # Duración en formato HH:MM:SS


# Modelo para canales de YouTube
class YouTubeChannel(db.Model):
    id = db.Column(db.String(64), primary_key=True)  # ID único del canal
    channel_id = db.Column(db.String(100), nullable=False, unique=True)  # ID del canal en YouTube
    title = db.Column(db.String(200), nullable=False)  # Título del canal
    description = db.Column(db.Text, nullable=True)  # Descripción del canal
    thumbnail = db.Column(db.String(255), nullable=True)  # URL de la miniatura
    subscriber_count = db.Column(db.Integer, default=0)  # Número de suscriptores
    video_count = db.Column(db.Integer, default=0)  # Número de videos
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # Fecha de creación
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)  # Fecha de actualización


# Crear tablas en la base de datos
with app.app_context():
    db.create_all()


def get_channel_id(url):
    """Extraer ID del canal de diferentes formatos de URL de YouTube."""
    if not url:
        return None

    # Manejar diferentes formatos de URL
    if "youtube.com/channel/" in url:
        # URL directa de canal
        match = re.search(r"youtube\.com/channel/([^/\?]+)", url)
        if match:
            return match.group(1)
    elif "@" in url:
        # Manejar formato @username
        match = re.search(r"@([^/\?]+)", url)
        if match:
            username = match.group(1)
            try:
                # Primero intentar obtener el canal directamente
                channel_url = f"https://www.googleapis.com/youtube/v3/channels?part=id&forHandle={username}&key={YOUTUBE_API_KEY}"
                response = requests.get(channel_url)
                data = response.json()

                # Verificar si obtenemos una respuesta válida
                if "items" in data and len(data["items"]) > 0:
                    return data["items"][0]["id"]

                # Si no, recurrir a una búsqueda
                search_url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={username}&type=channel&key={YOUTUBE_API_KEY}"
                response = requests.get(search_url)
                data = response.json()

                if "items" in data and len(data["items"]) > 0:
                    return data["items"][0]["snippet"]["channelId"]

            except Exception as e:
                logger.error(f"Error resolviendo @username: {e}")
                return None
    elif "youtube.com/c/" in url or "youtube.com/user/" in url:
        # URL personalizada - necesitamos hacer una llamada a la API para resolverla
        try:
            # Extraer el nombre personalizado
            if "youtube.com/c/" in url:
                custom_name = re.search(r"youtube\.com/c/([^/\?]+)", url).group(1)
            elif "youtube.com/user/" in url:
                custom_name = re.search(r"youtube.com/user/([^/\?]+)", url).group(1)
            else:
                return None

            # Resolver URL personalizada a ID de canal
            search_url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={custom_name}&type=channel&key={YOUTUBE_API_KEY}"
            response = requests.get(search_url)
            data = response.json()

            if "items" in data and len(data["items"]) > 0:
                return data["items"][0]["snippet"]["channelId"]
        except Exception as e:
            logger.error(f"Error resolviendo URL personalizada: {e}")
            return None

    return None


def get_channel_info(channel_id):
    """Obtener metadatos del canal desde la API de YouTube."""
    url = f"https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&id={channel_id}&key={YOUTUBE_API_KEY}"

    try:
        response = requests.get(url)
        data = response.json()

        if "items" not in data or len(data["items"]) == 0:
            return None

        channel_data = data["items"][0]
        uploads_playlist_id = channel_data["contentDetails"]["relatedPlaylists"][
            "uploads"
        ]

        return {
            "title": channel_data["snippet"]["title"],
            "description": channel_data["snippet"]["description"],
            "thumbnail": channel_data["snippet"]["thumbnails"]["high"]["url"],
            "uploads_playlist_id": uploads_playlist_id,
            "subscriber_count": int(channel_data["statistics"].get("subscriberCount", 0)),
            "video_count": int(channel_data["statistics"].get("videoCount", 0)),
            "view_count": int(channel_data["statistics"].get("viewCount", 0)),
            "published_at": channel_data["snippet"].get("publishedAt", ""),
            "country": channel_data["snippet"].get("country", ""),
        }
    except Exception as e:
        logger.error(f"Error obteniendo información del canal: {e}")
        return None


def get_videos(uploads_playlist_id, max_results=50):
    """Obtener videos de la lista de reproducción de subidas de un canal."""
    url = f"https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults={max_results}&playlistId={uploads_playlist_id}&key={YOUTUBE_API_KEY}"

    try:
        response = requests.get(url)
        data = response.json()

        if "items" not in data:
            return []

        videos = []
        for item in data["items"]:
            video_id = item["contentDetails"]["videoId"]

            # Verificar si el video ya está en caché
            cached_video = CachedVideo.query.get(video_id)
            duration = "00:00"
            file_size = 0

            if cached_video:
                duration = cached_video.duration
                file_size = cached_video.file_size
                # Actualizar último acceso
                cached_video.last_accessed = datetime.utcnow()
                db.session.commit()
            else:
                # Obtener información detallada del video (incluyendo duración)
                video_url = f"https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id={video_id}&key={YOUTUBE_API_KEY}"
                video_response = requests.get(video_url)
                video_data = video_response.json()

                if "items" in video_data and len(video_data["items"]) > 0:
                    # Convertir duración ISO 8601 a minutos:segundos
                    iso_duration = video_data["items"][0]["contentDetails"]["duration"]
                    minutes = re.search(
                        r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso_duration
                    )
                    if minutes:
                        hours = int(minutes.group(1) or 0)
                        mins = int(minutes.group(2) or 0)
                        secs = int(minutes.group(3) or 0)

                        if hours > 0:
                            duration = f"{hours:02d}:{mins:02d}:{secs:02d}"
                        else:
                            duration = f"{mins:02d}:{secs:02d}"

                    # Estimar tamaño basado en duración (estimación aproximada)
                    total_seconds = hours * 3600 + mins * 60 + secs
                    file_size = total_seconds * 32000  # Asumiendo audio de 32kbps

            # Formatear fecha de publicación
            published_at = item["snippet"]["publishedAt"]
            pub_date = datetime.strptime(published_at, "%Y-%m-%dT%H:%M:%SZ")
            rfc_pub_date = pub_date.strftime("%a, %d %b %Y %H:%M:%S GMT")

            videos.append(
                {
                    "id": video_id,
                    "title": item["snippet"]["title"],
                    "description": item["snippet"]["description"],
                    "thumbnail": (
                        item["snippet"]["thumbnails"]["high"]["url"]
                        if "high" in item["snippet"]["thumbnails"]
                        else ""
                    ),
                    "published_at": rfc_pub_date,
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "duration": duration,
                    "file_size": file_size,
                }
            )

        return videos
    except Exception as e:
        logger.error(f"Error obteniendo videos: {e}")
        return []


def generate_rss(channel_info, videos, base_url, feed_id):
    """Generar XML RSS a partir de datos del canal y videos."""
    rss = ET.Element("rss")
    rss.set("version", "2.0")
    rss.set("xmlns:itunes", "http://www.itunes.com/dtds/podcast-1.0.dtd")
    rss.set("xmlns:content", "http://purl.org/rss/1.0/modules/content/")

    channel = ET.SubElement(rss, "channel")

    # Metadatos del canal
    ET.SubElement(channel, "title").text = f"{channel_info['title']} (YouTube)"
    channel_url = f"{base_url}/feed/{feed_id}"
    ET.SubElement(channel, "link").text = channel_url
    ET.SubElement(channel, "description").text = (
        channel_info["description"]
        or f"Podcast feed for YouTube channel {channel_info['title']}"
    )
    ET.SubElement(channel, "language").text = "es-es"  # Cambiado a español
    ET.SubElement(channel, "itunes:author").text = channel_info["title"]

    # Imagen del canal
    image = ET.SubElement(channel, "itunes:image")
    image.set("href", channel_info["thumbnail"])

    # Imagen RSS estándar
    img = ET.SubElement(channel, "image")
    ET.SubElement(img, "url").text = channel_info["thumbnail"]
    ET.SubElement(img, "title").text = f"{channel_info['title']} (YouTube)"
    ET.SubElement(img, "link").text = channel_url

    # Categoría (genérica)
    ET.SubElement(channel, "itunes:category").set("text", "Technology")

    # Añadir elementos (videos)
    for video in videos:
        item = ET.SubElement(channel, "item")

        ET.SubElement(item, "title").text = video["title"]
        ET.SubElement(item, "description").text = video["description"]
        ET.SubElement(item, "link").text = video["url"]
        ET.SubElement(item, "guid").text = video["url"]
        ET.SubElement(item, "pubDate").text = video["published_at"]

        # Etiquetas específicas de iTunes
        ET.SubElement(item, "itunes:duration").text = video["duration"]

        # Enclosure - apunta a nuestra API de streaming de audio
        enclosure = ET.SubElement(item, "enclosure")
        audio_url = f"{base_url}/audio/{video['id']}"
        enclosure.set("url", audio_url)
        enclosure.set("length", str(video["file_size"]))
        enclosure.set("type", "audio/mpeg")

        # Imagen de iTunes (miniatura)
        if video["thumbnail"]:
            image = ET.SubElement(item, "itunes:image")
            image.set("href", video["thumbnail"])

    # Convertir a cadena
    tree = ET.ElementTree(rss)
    ET.indent(tree, space="  ", level=0)

    xml_str = ET.tostring(rss, encoding="utf-8", method="xml")
    return xml_str.decode("utf-8")


def download_audio(video_id):
    """Descargar audio de un video de YouTube usando yt-dlp."""
    output_path = os.path.join(AUDIO_CACHE_DIR, f"{video_id}.mp3")

    if os.path.exists(output_path):
        return output_path

    try:
        # Crear directorio temporal para la descarga
        temp_dir = tempfile.mkdtemp()
        temp_output = os.path.join(temp_dir, f"{video_id}.%(ext)s")

        # Opciones para extraer solo audio y convertir a MP3
        cmd = [
            "yt-dlp",
            "-f",
            "bestaudio",
            "-x",
            "--audio-format",
            "mp3",
            "--audio-quality",
            "128K",
            "--embed-thumbnail",
            "--add-metadata",
            "-o",
            temp_output,
            f"https://www.youtube.com/watch?v={video_id}",
        ]

        # Ejecutar yt-dlp
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()

        if process.returncode != 0:
            logger.error(f"Error descargando audio: {stderr.decode()}")
            return None

        # Mover archivo descargado al directorio de caché
        for file in os.listdir(temp_dir):
            if file.endswith(".mp3"):
                src_path = os.path.join(temp_dir, file)
                shutil.move(src_path, output_path)

                # Obtener tamaño y duración
                file_size = os.path.getsize(output_path)

                # Usar ffprobe para obtener la duración
                duration_cmd = [
                    "ffprobe",
                    "-v",
                    "error",
                    "-show_entries",
                    "format=duration",
                    "-of",
                    "default=noprint_wrappers=1:nokey=1",
                    output_path,
                ]

                duration_process = subprocess.Popen(
                    duration_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE
                )
                duration_stdout, _ = duration_process.communicate()

                duration_secs = float(duration_stdout.decode().strip())
                hours, remainder = divmod(int(duration_secs), 3600)
                minutes, seconds = divmod(remainder, 60)

                if hours > 0:
                    duration_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
                else:
                    duration_str = f"{minutes:02d}:{seconds:02d}"

                # Guardar información en la base de datos
                video = CachedVideo.query.get(video_id)
                if not video:
                    # Obtener título del video
                    info_cmd = [
                        "yt-dlp",
                        "--skip-download",
                        "--print",
                        "title",
                        f"https://www.youtube.com/watch?v={video_id}",
                    ]

                    info_process = subprocess.Popen(
                        info_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE
                    )
                    info_stdout, _ = info_process.communicate()
                    title = info_stdout.decode().strip()

                    video = CachedVideo(
                        id=video_id,
                        title=title,
                        audio_path=output_path,
                        file_size=file_size,
                        duration=duration_str,
                    )
                else:
                    video.audio_path = output_path
                    video.file_size = file_size
                    video.duration = duration_str
                    video.last_accessed = datetime.utcnow()

                db.session.add(video)
                db.session.commit()

                return output_path

        # Limpiar directorio temporal
        shutil.rmtree(temp_dir)

        return None

    except Exception as e:
        logger.error(f"Error en descarga de audio: {e}")
        return None


@app.route("/")
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route("/<path:path>")
def serve_static(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

@app.route("/feed/<feed_id>")
def view_feed(feed_id):
    """Ver el feed RSS."""
    logger.info(f"Accessing feed with ID: {feed_id}")
    
    # Check if feed exists
    feed = PodcastFeed.query.get(feed_id)
    if not feed:
        logger.error(f"Feed with ID {feed_id} not found in database")
        return jsonify({"error": f"Feed with ID {feed_id} not found"}), 404
    
    logger.info(f"Feed found: {feed.channel_title}")

    # Si el feed tiene más de 1 hora, actualizarlo
    if (datetime.utcnow() - feed.last_updated) > timedelta(hours=1):
        logger.info(f"Feed {feed_id} is outdated, updating in background")
        # Lanzar actualización en segundo plano
        thread = threading.Thread(target=update_feed, args=(feed_id,))
        thread.daemon = True
        thread.start()

    response = make_response(feed.rss_content)
    response.headers["Content-Type"] = "application/rss+xml"
    return response


def update_feed(feed_id):
    """Actualizar feed en segundo plano."""
    with app.app_context():
        feed = PodcastFeed.query.get(feed_id)
        if not feed:
            return

        channel_info = get_channel_info(feed.channel_id)
        if not channel_info:
            return

        videos = get_videos(channel_info["uploads_playlist_id"])
        if not videos:
            return

        base_url = os.getenv("BASE_URL", "http://localhost:5000").rstrip("/")
        rss_content = generate_rss(channel_info, videos, base_url, feed_id)

        feed.rss_content = rss_content
        feed.last_updated = datetime.utcnow()
        db.session.commit()


@app.route("/audio/<video_id>")
def stream_audio(video_id):
    """Stream audio directly from YouTube using yt-dlp."""

    def generate():
        # Set up yt-dlp command to stream audio
        cmd = [
            "yt-dlp",
            "-f",
            "bestaudio",
            "-o",
            "-",  # Output to stdout
            "--no-continue",  # Don't resume downloads
            "--no-part",  # Don't create temporary .part files
            "--no-playlist",  # Single video only
            f"https://www.youtube.com/watch?v={video_id}",
        ]

        try:
            # Start yt-dlp process
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=10**8,  # Large buffer for smooth streaming
            )

            # Stream the output in chunks
            while True:
                chunk = process.stdout.read(8192)  # 8KB chunks
                if not chunk:
                    break
                yield chunk

        except Exception as e:
            logger.error(f"Error streaming audio for video {video_id}: {e}")
            yield b""

    return Response(
        generate(),
        mimetype="audio/mpeg",
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-cache",
            "Transfer-Encoding": "chunked",
        },
    )


@app.route("/preview/<feed_id>")
def preview(feed_id):
    # First, try to find a feed with this ID
    feed = PodcastFeed.query.get(feed_id)
    
    if feed:
        # If found, use the feed's channel_id
        channel_id = feed.channel_id
    else:
        # Check if this is a channel ID
        channel = YouTubeChannel.query.get(feed_id)
        if channel:
            channel_id = channel.channel_id
        else:
            return jsonify({"error": "Feed or channel not found"}), 404
    
    channel_info = get_channel_info(channel_id)

    if not channel_info:
        return jsonify({"error": "Could not retrieve channel information."}), 400

    videos = get_videos(channel_info["uploads_playlist_id"], max_results=10)
    if not videos:
        return jsonify({"error": "No videos found for this channel."}), 400
    
    # If we found a channel but not a feed, create a feed ID
    if not feed:
        feed_id = hashlib.md5(channel_id.encode()).hexdigest()

    return jsonify(
        {
            "channel": channel_info,
            "videos": videos,
            "feed_url": url_for("view_feed", feed_id=feed_id, _external=True),
        }
    )


@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json()
    youtube_url = data.get("youtube_url")

    if not youtube_url:
        return jsonify({"error": "Please provide a YouTube URL"}), 400

    # Handle direct username input
    if not ("youtube.com" in youtube_url or "youtu.be" in youtube_url):
        if youtube_url.startswith("@"):
            youtube_url = f"https://www.youtube.com/{youtube_url}"
        else:
            youtube_url = f"https://www.youtube.com/@{youtube_url}"

    # Get channel ID
    channel_id = get_channel_id(youtube_url)
    if not channel_id:
        return (
            jsonify({"error": "Could not extract channel ID. Please verify the URL."}),
            400,
        )

    # Get channel info
    channel_info = get_channel_info(channel_id)
    if not channel_info:
        return jsonify({"error": "Could not retrieve channel information."}), 400

    # Create feed ID
    feed_id = hashlib.md5(channel_id.encode()).hexdigest()

    # Check if feed exists
    existing_feed = PodcastFeed.query.get(feed_id)
    if existing_feed:
        return jsonify({"feed_id": feed_id})

    # Get videos
    videos = get_videos(channel_info["uploads_playlist_id"])
    if not videos:
        return jsonify({"error": "No videos found for this channel."}), 400

    # Generate RSS
    base_url = os.getenv("BASE_URL", "http://localhost:5000").rstrip("/")
    rss_content = generate_rss(channel_info, videos, base_url, feed_id)

    # Save feed
    new_feed = PodcastFeed(
        id=feed_id,
        channel_id=channel_id,
        channel_title=channel_info["title"],
        last_updated=datetime.utcnow(),
        rss_content=rss_content,
    )
    db.session.add(new_feed)
    
    # Save or update channel information
    channel_hash = hashlib.sha256(channel_id.encode()).hexdigest()
    existing_channel = YouTubeChannel.query.filter_by(channel_id=channel_id).first()
    
    if existing_channel:
        # Update existing channel
        existing_channel.title = channel_info["title"]
        existing_channel.description = channel_info.get("description", "")
        existing_channel.thumbnail = channel_info.get("thumbnail", "")
        existing_channel.subscriber_count = channel_info.get("subscriber_count", 0)
        existing_channel.video_count = len(videos)
    else:
        # Create new channel
        new_channel = YouTubeChannel(
            id=channel_hash,
            channel_id=channel_id,
            title=channel_info["title"],
            description=channel_info.get("description", ""),
            thumbnail=channel_info.get("thumbnail", ""),
            subscriber_count=channel_info.get("subscriber_count", 0),
            video_count=len(videos)
        )
        db.session.add(new_channel)
    
    db.session.commit()

    return jsonify({"feed_id": feed_id})


@app.route("/list")
def list_feeds():
    """Listar todos los feeds disponibles."""
    feeds = PodcastFeed.query.order_by(PodcastFeed.last_updated.desc()).all()
    return render_template("list.html", feeds=feeds)


@app.route("/health")
def health_check():
    return jsonify({"status": "healthy"})


@app.route("/cleanup")
def cleanup():
    """Limpiar archivos de audio no utilizados (solo para administradores)."""
    # Verificar si es administrador (implementar autenticación si es necesario)
    if request.args.get("key") != os.getenv("ADMIN_KEY", "admin"):
        return "Acceso denegado", 403

    # Encontrar videos no accedidos en más de 30 días
    month_ago = datetime.utcnow() - timedelta(days=30)
    old_videos = CachedVideo.query.filter(CachedVideo.last_accessed < month_ago).all()

    count = 0
    for video in old_videos:
        if video.audio_path and os.path.exists(video.audio_path):
            # Eliminar archivo
            os.remove(video.audio_path)
            count += 1

        # Eliminar registro
        db.session.delete(video)

    db.session.commit()

    return f"Limpieza completada. {count} archivos eliminados."


# API endpoints for YouTube channel management
@app.route("/api/channels", methods=["GET"])
def list_channels():
    """List all YouTube channels."""
    channels = YouTubeChannel.query.order_by(YouTubeChannel.updated_at.desc()).all()
    return jsonify({
        "channels": [
            {
                "id": channel.id,
                "channel_id": channel.channel_id,
                "title": channel.title,
                "description": channel.description,
                "thumbnail": channel.thumbnail,
                "subscriber_count": channel.subscriber_count,
                "video_count": channel.video_count,
                "created_at": channel.created_at.isoformat(),
                "updated_at": channel.updated_at.isoformat()
            }
            for channel in channels
        ]
    })


@app.route("/api/channels/<channel_id>", methods=["GET"])
def get_channel(channel_id):
    """Get a specific YouTube channel."""
    channel = YouTubeChannel.query.get_or_404(channel_id)
    return jsonify({
        "id": channel.id,
        "channel_id": channel.channel_id,
        "title": channel.title,
        "description": channel.description,
        "thumbnail": channel.thumbnail,
        "subscriber_count": channel.subscriber_count,
        "video_count": channel.video_count,
        "created_at": channel.created_at.isoformat(),
        "updated_at": channel.updated_at.isoformat()
    })


@app.route("/api/channels", methods=["POST"])
def create_channel():
    """Create a new YouTube channel."""
    data = request.json
    
    # Obtener el channel_id de la URL si es necesario
    channel_url = data.get("channel_id", "")
    real_channel_id = None
    
    # Si parece una URL, intentar extraer el ID del canal
    if "youtube.com" in channel_url or "@" in channel_url:
        real_channel_id = get_channel_id(channel_url)
        if not real_channel_id:
            return jsonify({"error": "No se pudo obtener el ID del canal desde la URL proporcionada"}), 400
    else:
        # Asumir que ya es un ID de canal
        real_channel_id = channel_url
    
    # Check if channel already exists
    existing_channel = YouTubeChannel.query.filter_by(channel_id=real_channel_id).first()
    if existing_channel:
        return jsonify({"error": "Channel already exists"}), 409
    
    # Generate a unique ID for the channel
    channel_id = hashlib.sha256(real_channel_id.encode()).hexdigest()
    
    # Obtener información del canal desde la API de YouTube
    channel_info = get_channel_info(real_channel_id)
    if not channel_info:
        return jsonify({"error": "No se pudo obtener información del canal desde YouTube"}), 400
    
    # Create new channel
    new_channel = YouTubeChannel(
        id=channel_id,
        channel_id=real_channel_id,
        title=data.get("title") or channel_info["title"],
        description=data.get("description") or channel_info["description"],
        thumbnail=data.get("thumbnail") or channel_info["thumbnail"],
        subscriber_count=channel_info["subscriber_count"],
        video_count=channel_info["video_count"]
    )
    
    db.session.add(new_channel)
    db.session.commit()
    
    # Crear feed automáticamente
    try:
        feed_id = hashlib.md5(real_channel_id.encode()).hexdigest()
        
        # Verificar si ya existe un feed para este canal
        existing_feed = PodcastFeed.query.get(feed_id)
        if not existing_feed:
            # Obtener videos para el feed
            videos = get_videos(channel_info["uploads_playlist_id"])
            
            # Generar contenido RSS
            base_url = os.getenv("BASE_URL", request.url_root.rstrip("/"))
            rss_content = generate_rss(channel_info, videos, base_url, feed_id)
            
            # Crear nuevo feed
            new_feed = PodcastFeed(
                id=feed_id,
                channel_id=real_channel_id,
                channel_title=new_channel.title,
                rss_content=rss_content
            )
            
            db.session.add(new_feed)
            db.session.commit()
    except Exception as e:
        logger.error(f"Error al crear feed automáticamente: {e}")
        # No fallar la creación del canal si hay un error al crear el feed
    
    return jsonify({
        "id": new_channel.id,
        "channel_id": new_channel.channel_id,
        "title": new_channel.title,
        "description": new_channel.description,
        "thumbnail": new_channel.thumbnail,
        "subscriber_count": new_channel.subscriber_count,
        "video_count": new_channel.video_count,
        "created_at": new_channel.created_at.isoformat(),
        "updated_at": new_channel.updated_at.isoformat()
    }), 201


@app.route("/api/feeds", methods=["POST"])
def create_feed():
    """Create a new podcast feed for a channel."""
    data = request.json
    channel_id = data.get("channel_id")
    
    if not channel_id:
        return jsonify({"error": "Se requiere channel_id"}), 400
    
    # Buscar el canal
    channel = YouTubeChannel.query.get(channel_id)
    if not channel:
        return jsonify({"error": "Canal no encontrado"}), 404
    
    # Generar ID del feed
    feed_id = hashlib.md5(channel.channel_id.encode()).hexdigest()
    
    # Verificar si ya existe un feed
    existing_feed = PodcastFeed.query.get(feed_id)
    if existing_feed:
        return jsonify({
            "id": existing_feed.id,
            "channel_id": existing_feed.channel_id,
            "channel_title": existing_feed.channel_title,
            "last_updated": existing_feed.last_updated.isoformat(),
            "feed_url": url_for("view_feed", feed_id=feed_id, _external=True)
        }), 200
    
    # Obtener información del canal
    channel_info = get_channel_info(channel.channel_id)
    if not channel_info:
        return jsonify({"error": "No se pudo obtener información del canal"}), 400
    
    # Obtener videos
    videos = get_videos(channel_info["uploads_playlist_id"])
    
    # Generar contenido RSS
    base_url = os.getenv("BASE_URL", request.url_root.rstrip("/"))
    rss_content = generate_rss(channel_info, videos, base_url, feed_id)
    
    # Crear nuevo feed
    new_feed = PodcastFeed(
        id=feed_id,
        channel_id=channel.channel_id,
        channel_title=channel.title,
        rss_content=rss_content
    )
    
    db.session.add(new_feed)
    db.session.commit()
    
    return jsonify({
        "id": new_feed.id,
        "channel_id": new_feed.channel_id,
        "channel_title": new_feed.channel_title,
        "last_updated": new_feed.last_updated.isoformat(),
        "feed_url": url_for("view_feed", feed_id=feed_id, _external=True)
    }), 201


@app.route("/api/channels/<channel_id>", methods=["PUT"])
def update_channel(channel_id):
    """Update a YouTube channel."""
    channel = YouTubeChannel.query.get_or_404(channel_id)
    data = request.json
    
    # Update channel fields
    if "title" in data:
        channel.title = data["title"]
    if "description" in data:
        channel.description = data["description"]
    if "thumbnail" in data:
        channel.thumbnail = data["thumbnail"]
    if "subscriber_count" in data:
        channel.subscriber_count = data["subscriber_count"]
    if "video_count" in data:
        channel.video_count = data["video_count"]
    
    db.session.commit()
    
    return jsonify({
        "id": channel.id,
        "channel_id": channel.channel_id,
        "title": channel.title,
        "description": channel.description,
        "thumbnail": channel.thumbnail,
        "subscriber_count": channel.subscriber_count,
        "video_count": channel.video_count,
        "created_at": channel.created_at.isoformat(),
        "updated_at": channel.updated_at.isoformat()
    })


@app.route("/api/channels/<channel_id>", methods=["DELETE"])
def delete_channel(channel_id):
    """Delete a YouTube channel."""
    channel = YouTubeChannel.query.get_or_404(channel_id)
    
    db.session.delete(channel)
    db.session.commit()
    
    return jsonify({"message": "Channel deleted successfully"}), 200


@app.route("/api/check-feed/<feed_id>", methods=["GET"])
def check_feed(feed_id):
    """Check if a feed exists and return its details."""
    feed = PodcastFeed.query.get(feed_id)
    
    if not feed:
        return jsonify({
            "exists": False,
            "message": f"Feed with ID {feed_id} not found"
        }), 404
    
    return jsonify({
        "exists": True,
        "feed_id": feed.id,
        "channel_id": feed.channel_id,
        "channel_title": feed.channel_title,
        "last_updated": feed.last_updated.isoformat() if feed.last_updated else None,
        "has_rss_content": bool(feed.rss_content)
    })


if __name__ == "__main__":
    # Obtener puerto de las variables de entorno o usar 5000 por defecto
    port = int(os.environ.get("PORT", 5000))

    # Configurar host para ser accesible desde fuera
    run_simple("0.0.0.0", port, app, use_reloader=True, use_debugger=True)
