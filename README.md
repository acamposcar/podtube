# PodTube - YouTube to Podcast Converter

PodTube is a modern web application that converts YouTube channels into podcast feeds, allowing you to listen to your favorite YouTube content as podcasts.

## Features

- 🎧 Convert any YouTube channel into a podcast feed
- 📱 Modern, responsive UI with dark mode support
- 🔍 Search and manage your podcast feeds
- 📋 Copy feed URLs to use in your favorite podcast app
- 🎨 Beautiful, intuitive interface with best-in-class UX

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Python, Flask
- **Database**: SQLite

## Getting Started

### Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/podcast.git
   cd podcast
   ```

2. Install backend dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

1. Start the backend server:

   ```bash
   python app.py
   ```

2. In a separate terminal, start the frontend development server:

   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Add a YouTube channel by providing its URL
2. View the generated podcast feed
3. Copy the feed URL and add it to your favorite podcast app
4. Enjoy listening to YouTube content as podcasts!

## Screenshots

![Home Screen](screenshots/home.png)
![Channel View](screenshots/channel.png)
![Feed Preview](screenshots/preview.png)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [YouTube API](https://developers.google.com/youtube/v3)
- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)
- [Flask](https://flask.palletsprojects.com/)
