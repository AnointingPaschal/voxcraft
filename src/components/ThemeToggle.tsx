import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('vc_theme') as 'light' | 'dark') || (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'))
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
    window.addEventListener('vc-theme-changed', sync)
    return () => window.removeEventListener('vc-theme-changed', sync)
  }, [])
  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = next
    localStorage.setItem('vc_theme', next)
    setTheme(next)
    window.dispatchEvent(new Event('vc-theme-changed'))
  }
  return <button type="button" onClick={toggle} className="theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} title={`${theme === 'light' ? 'Dark' : 'Light'} theme`}>{theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button>
}
