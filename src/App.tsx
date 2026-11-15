import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PortfolioPage } from './pages/PortfolioPage';
import { AdminPage } from './pages/AdminPage';

function normalizeRoute(pathname: string): '/' | '/admin' {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return '/admin';
  }
  return '/';
}

export default function App() {
  const [route, setRoute] = useState<'/' | '/admin'>(() => normalizeRoute(window.location.pathname));

  useEffect(() => {
    const onPopState = () => {
      setRoute(normalizeRoute(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    const target = normalizeRoute(path);
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
    }
    setRoute(target);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <AnimatePresence mode="wait">
      {route === '/admin' ? (
        <motion.div
          key="admin"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <AdminPage onNavigate={navigate} />
        </motion.div>
      ) : (
        <motion.div
          key="portfolio"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <PortfolioPage onNavigate={navigate} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
