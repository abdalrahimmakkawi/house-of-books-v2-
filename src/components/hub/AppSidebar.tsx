import { motion } from 'framer-motion'

interface AppSidebarProps {
  activePage: 'feed' | 'explore' | 'shelf' | 'communities' | 'notifications'
  onNavigate: (page: AppSidebarProps['activePage']) => void
  userEmail: string
  notificationCount?: number
}

const NAV_ITEMS = [
  {
    id: 'feed' as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
    label: 'Feed',
  },
  {
    id: 'explore' as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    label: 'Explore',
  },
  {
    id: 'shelf' as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      </svg>
    ),
    label: 'My Shelf',
  },
  {
    id: 'communities' as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    label: 'Communities',
  },
  {
    id: 'notifications' as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ),
    label: 'Notifications',
    hasNotification: true,
  },
]

const styles = `
  .hub-sidebar {
    width: 68px;
    background: #13131a;
    border-right: 1px solid rgba(255,255,255,0.07);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 0;
    gap: 6px;
    flex-shrink: 0;
    z-index: 10;
    height: 100%;
  }

  .hub-logo-mark {
    width: 38px;
    height: 38px;
    background: #e8a84c;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Georgia, serif;
    font-weight: 700;
    color: #0d0d0f;
    font-size: 18px;
    margin-bottom: 16px;
    cursor: pointer;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(232,168,76,0.3);
  }

  .hub-nav-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: rgba(255,255,255,0.25);
    transition: all 0.15s;
    position: relative;
    border: 1px solid transparent;
  }

  .hub-nav-icon:hover {
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.6);
  }

  .hub-nav-icon.active {
    background: rgba(232,168,76,0.12);
    color: #e8a84c;
    border-color: rgba(232,168,76,0.2);
  }

  .hub-nav-dot {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 7px;
    height: 7px;
    background: #e85c7a;
    border-radius: 50%;
    border: 2px solid #13131a;
  }

  .hub-nav-tooltip {
    position: absolute;
    left: calc(100% + 10px);
    background: #1e1e2e;
    border: 1px solid rgba(255,255,255,0.1);
    color: #f0ede8;
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 6px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 100;
    font-family: 'DM Sans', sans-serif;
  }

  .hub-nav-icon:hover .hub-nav-tooltip {
    opacity: 1;
  }

  .hub-sidebar-bottom {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .hub-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e8a84c, #e85c7a);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: white;
    cursor: pointer;
    border: 2px solid rgba(232,168,76,0.3);
    transition: border-color 0.2s;
    font-family: 'DM Sans', sans-serif;
  }

  .hub-avatar:hover {
    border-color: #e8a84c;
  }

  .hub-settings-btn {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: rgba(255,255,255,0.25);
    transition: all 0.15s;
    border: 1px solid transparent;
  }

  .hub-settings-btn:hover {
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.6);
  }
`

export default function AppSidebar({ activePage, onNavigate, userEmail, notificationCount = 0 }: AppSidebarProps) {
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : 'AR'

  return (
    <>
      <style>{styles}</style>
      <div className="hub-sidebar">
        {/* Logo */}
        <motion.div
          className="hub-logo-mark"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          H
        </motion.div>

        {/* Nav items */}
        {NAV_ITEMS.map((item) => (
          <motion.div
            key={item.id}
            className={`hub-nav-icon ${activePage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={item.label}
          >
            {item.icon}
            {item.hasNotification && notificationCount > 0 && (
              <div className="hub-nav-dot" />
            )}
            <span className="hub-nav-tooltip">{item.label}</span>
          </motion.div>
        ))}

        {/* Bottom section */}
        <div className="hub-sidebar-bottom">
          {/* Settings */}
          <motion.div
            className="hub-settings-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </motion.div>

          {/* Avatar */}
          <motion.div
            className="hub-avatar"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={userEmail}
          >
            {initials}
          </motion.div>
        </div>
      </div>
    </>
  )
}
