import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Preview from './pages/Preview';
import Channels from './pages/Channels';
import { Button } from './components/ui/button';
import { Home, Radio, Menu, X, Youtube, Moon, Sun } from 'lucide-react';

// Layout component with sidebar
function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const location = useLocation();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    // Close sidebar on mobile when route changes
    setIsSidebarOpen(false);
  }, [location]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const navItems = [
    { path: '/', label: 'Channels', icon: <Home className="h-5 w-5" /> },
    { path: '/preview/latest', label: 'Latest Feed', icon: <Radio className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Youtube className="h-6 w-6 text-youtube-red" />
          <span className="font-display font-semibold text-lg">PodTube</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar header */}
            <div className="p-4 flex items-center justify-between border-b">
              <div className="flex items-center gap-2">
                <Youtube className="h-6 w-6 text-youtube-red" />
                <span className="font-display font-semibold text-lg">PodTube</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon-sm" 
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant={location.pathname === item.path ? "subtle" : "ghost"}
                  className={`w-full justify-start gap-3 ${
                    location.pathname === item.path ? 'bg-muted font-medium' : ''
                  }`}
                  asChild
                >
                  <Link to={item.path}>
                    {item.icon}
                    {item.label}
                  </Link>
                </Button>
              ))}
            </nav>
            
            {/* Sidebar footer */}
            <div className="p-4 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start gap-3"
                onClick={toggleDarkMode}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </Button>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><Channels /></Layout>} />
        <Route path="/preview/:feedId" element={<Layout><Preview /></Layout>} />
      </Routes>
    </Router>
  );
}

export default App; 