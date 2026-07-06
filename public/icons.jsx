// 윌앤비전 - 아이콘 (lucide / heroicons 풍, 1.5px stroke)
const Icon = ({ name, size = 16, className = "", style }) => {
  const paths = {
    home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" /></>,
    bell: <><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 20h16" /></>,
    download: <><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 20h16" /></>,
    file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6M9 9h2" /></>,
    book: <><path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z" /><path d="M4 17a3 3 0 0 1 3-3h12" /></>,
    graduation: <><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5a6 6 0 0 0 12 0v-5" /></>,
    alert: <><path d="M12 3 1 21h22z" /><path d="M12 10v5M12 18v.5" /></>,
    flask: <><path d="M10 3v6L5 19a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-10V3" /><path d="M9 3h6" /></>,
    body: <><circle cx="12" cy="4" r="2" /><path d="M12 6v6M9 22v-6l-3-5M15 22v-6l3-5M9 12h6" /></>,
    sign: <><path d="M3 4h12l3 3-3 3H3z" /><path d="M9 10v10M5 20h8" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m4 18 5-5 4 4 3-3 4 4" /></>,
    "check-square": <><rect x="3" y="3" width="18" height="18" rx="2" /><polyline points="9 11 12 14 22 4" /><polyline points="3 7 3 21 21 21" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" /><circle cx="17" cy="9" r="2.5" /><path d="M14 14h2a5 5 0 0 1 5 5v1" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .4 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.4 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .4-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.4h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.4l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.4 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1" /></>,
    inbox: <><path d="M22 13h-7l-2 3h-2l-2-3H2" /><path d="M5 4h14l3 9v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-7z" /></>,
    chart: <><path d="M3 3v18h18" /><path d="M7 14l3-3 3 3 5-5" /></>,
    pie: <><path d="M21 12A9 9 0 1 1 12 3v9z" /><path d="M12 3a9 9 0 0 1 9 9h-9z" /></>,
    list: <><path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    pin: <><path d="M12 17v5" /><path d="M5 4h14l-2 8c-2 0-3 1-3 3H10c0-2-1-3-3-3z" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
    "eye-off": <><path d="M17.9 17.9A11 11 0 0 1 12 19c-6.5 0-10-7-10-7a18.4 18.4 0 0 1 4.2-4.9" /><path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a18.4 18.4 0 0 1-3 4" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="M2 2l20 20" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <><path d="m5 12 5 5 9-11" /></>,
    "check-circle": <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    x: <><path d="M6 6l12 12M18 6 6 18" /></>,
    "x-circle": <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    "arrow-left": <><path d="M19 12H5M11 6l-6 6 6 6" /></>,
    "chevron-right": <><path d="m9 6 6 6-6 6" /></>,
    moon: <><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    filter: <><path d="M3 5h18l-7 9v6l-4-2v-4z" /></>,
    sort: <><path d="M3 6h13M3 12h9M3 18h5" /><path d="m17 14 3 4 3-4M20 8v10" /></>,
    paperclip: <><path d="M21 11.5 13 19a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7-7" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
    trash: <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></>,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
    unlock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 7-2.7" /></>,
    shield: <><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z" /></>,
    "shield-check": <><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z" /><path d="m9 12 2 2 4-5" /></>,
    comment: <><path d="M21 11.5a8 8 0 0 1-8 8 7.8 7.8 0 0 1-3.7-.9L3 21l1.5-5.3A8 8 0 1 1 21 11.5z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
    "user-plus": <><circle cx="9" cy="8" r="4" /><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" /><path d="M19 8v6M16 11h6" /></>,
    menu: <><path d="M3 6h18M3 12h18M3 18h18" /></>,
    "external-link": <><path d="M15 3h6v6" /><path d="m10 14 11-11M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></>,
    "more-horizontal": <><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>,
    refresh: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>,
    flag: <><path d="M4 4v18" /><path d="M4 4h13l-2 5 2 5H4" /></>,
    star: <><path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" /></>,
    activity: <><path d="M22 12h-4l-3 9-6-18-3 9H2" /></>,
    bookmark: <><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></>,
    printer: <><path d="M6 9V3h12v6" /><rect x="2" y="9" width="20" height="9" rx="1" /><path d="M6 15h12v6H6z" /><path d="M18 12h.01" /></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
         className={className} style={style} aria-hidden="true">
      {paths[name] || paths.doc}
    </svg>
  );
};

window.Icon = Icon;
