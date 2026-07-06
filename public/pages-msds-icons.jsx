// pages-msds-icons.jsx — GHS / PPE 이미지 컴포넌트

const GhsPic = ({ id, size }) => (
  <img
    src={`assets/ghs/ghs${String(id).padStart(2, '0')}.png`}
    width={size || 72} height={size || 72}
    style={{ display: 'inline-block', verticalAlign: 'middle', objectFit: 'contain' }}
    alt={`GHS0${id}`}
  />
);

const PpePic = ({ id, size }) => (
  <img
    src={`assets/ppe/ppe${id}.png`}
    width={size || 60} height={size || 60}
    style={{ display: 'block', margin: '0 auto', objectFit: 'contain' }}
    alt={`PPE${id}`}
  />
);

Object.assign(window, { GhsPic, PpePic });
