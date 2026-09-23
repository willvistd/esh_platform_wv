// 윌앤비전 - 로그인 화면

const LOCKOUT_THRESHOLD = 5;

const LoginScreen = ({ onLogin }) => {
  const D = window.WV_DATA;
  const [mode, setMode] = React.useState("login");      // login | register
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [error, setError] = React.useState("");
  const [warn, setWarn] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [attempts, setAttempts] = React.useState({}); // {email: count}
  const [locked, setLocked] = React.useState({});      // {email: true}
  const [forgotOpen, setForgotOpen] = React.useState(false);
  const [policyOpen, setPolicyOpen] = React.useState(false);
  const [demo, setDemo] = React.useState(false);
  const [otp, setOtp] = React.useState(null);       // { pendingId, emailMasked }
  const [otpCode, setOtpCode] = React.useState("");
  const [otpMsg, setOtpMsg] = React.useState("");

  // 데모 모드 여부 확인 (데모 배포에서만 true)
  React.useEffect(() => {
    fetch("/api/meta").then(r => r.json()).then(m => setDemo(!!(m && m.demo))).catch(() => {});
  }, []);
  // 동시접속 차단으로 밀려나 로그아웃된 경우 안내
  React.useEffect(() => {
    try { const m = localStorage.getItem("wv_kick_msg"); if (m) { setWarn(m); localStorage.removeItem("wv_kick_msg"); } } catch (e) {}
  }, []);
  const fillDemo = () => { setEmail("demo@demo.com"); setPassword("demo1234"); };

  // 가입 화면이면 RegisterScreen만 렌더링
  if (mode === "register") {
    return <RegisterScreen onBack={() => setMode("login")} />;
  }

  const submit = async (e) => {
    e?.preventDefault?.();
    setError(""); setWarn("");
    const tries = (attempts[email] || 0);
    if (locked[email]) {
      setError("5회 이상 로그인 실패로 계정이 잠금 상태입니다. 관리자에게 문의해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const result = await window.WV_API.login(email.toLowerCase().trim(), password);
      if (result.success) {
        setLoading(false);
        onLogin(result.user);
      } else if (result.otpRequired) {
        // 새 기기 — 이메일 인증코드 입력 단계로
        setLoading(false); setError(""); setWarn("");
        setOtp({ pendingId: result.pendingId, emailMasked: result.emailMasked });
        setOtpCode(""); setOtpMsg("");
      } else {
        const next = tries + 1;
        const a = { ...attempts, [email]: next };
        setAttempts(a);
        if (next >= LOCKOUT_THRESHOLD) {
          setLocked({ ...locked, [email]: true });
          setError(`5회 로그인 실패로 계정이 잠금되었습니다. 관리자(security@willnvision.co.kr)에게 문의해 주세요.`);
        } else {
          setError(`${result.message || "아이디 또는 비밀번호가 일치하지 않습니다."} (${next}/${LOCKOUT_THRESHOLD}회 시도)`);
          if (LOCKOUT_THRESHOLD - next <= 2) {
            setWarn(`로그인 ${LOCKOUT_THRESHOLD - next}회 더 실패하면 계정이 잠금됩니다.`);
          }
        }
        setLoading(false);
      }
    } catch (err) {
      setError("서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setLoading(false);
    }
  };

  // 새 기기 이메일 인증코드 검증
  const submitOtp = async (e) => {
    e?.preventDefault?.();
    if (!otp) return;
    setOtpMsg(""); setLoading(true);
    try {
      const result = await window.WV_API.verifyOtp(otp.pendingId, otpCode);
      if (result.success) { setLoading(false); onLogin(result.user); }
      else { setLoading(false); setOtpMsg(result.message || "인증코드가 올바르지 않습니다."); }
    } catch (err) { setLoading(false); setOtpMsg("서버 연결에 실패했습니다."); }
  };
  const resendOtp = async () => {
    if (!otp) return;
    setOtpMsg("");
    const r = await window.WV_API.resendOtp(otp.pendingId);
    setOtpMsg(r && r.success ? "인증코드를 다시 보냈습니다." : (r && r.message) || "재발송에 실패했습니다.");
  };

  // 새 기기 인증코드 입력 화면
  if (otp) {
    return (
      <div className="login-page">
        <aside className="login-brand">
          <div className="login-brand-inner">
            <div className="login-brand-mark">
              <img src="assets/logo-will-vision2.png" alt="윌앤비전 로고" className="login-brand-logo" />
              <div>
                <div className="login-brand-name">Will&amp;Vision</div>
                <div className="login-brand-sub">통합 안전보건 플랫폼</div>
              </div>
            </div>
          </div>
        </aside>
        <main className="login-form-panel">
          <div className="login-form-wrap">
            <h1 className="login-title">새 기기 인증</h1>
            <p className="login-subtitle" style={{ marginBottom: 20 }}>
              처음 접속하는 기기예요. <b>{otp.emailMasked}</b> 로 보낸<br />6자리 인증코드를 입력해 주세요. (유효 10분)
            </p>
            <form onSubmit={submitOtp}>
              <div className="login-field">
                <label className="login-label">인증코드</label>
                <input className="login-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                  value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="숫자 6자리" autoFocus
                  style={{ letterSpacing: 6, fontSize: 20, textAlign: "center", fontWeight: 700 }} />
              </div>
              {otpMsg && <div className={otpMsg.includes("보냈") ? "login-warn" : "login-error"} role="alert" style={{ marginTop: 6 }}><Icon name="alert" size={13} /> {otpMsg}</div>}
              <button type="submit" className="login-btn" disabled={loading || otpCode.length < 6} style={{ marginTop: 16 }}>
                {loading ? <span className="login-spinner" /> : "인증하고 로그인"}
              </button>
            </form>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 13 }}>
              <button type="button" onClick={resendOtp} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontWeight: 600, padding: 0 }}>코드 다시 받기</button>
              <button type="button" onClick={() => { setOtp(null); setOtpCode(""); setOtpMsg(""); setPassword(""); }} style={{ background: "none", border: "none", color: "var(--fg-3)", cursor: "pointer", padding: 0 }}>← 다시 로그인</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="login-page">
      {/* Left brand panel */}
      <aside className="login-brand">
        <div className="login-brand-inner">
          <div className="login-brand-mark">
            <img
              src="assets/logo-will-vision2.png"
              alt="윌앤비전 주식회사 로고"
              className="login-brand-logo"
            />
            <div>
              <div className="login-brand-name">Will&amp;Vision</div>
              <div className="login-brand-sub">통합 안전보건 플랫폼</div>
            </div>
          </div>

          <div className="login-brand-pitch">
            <div className="login-brand-eyebrow"><Icon name="shield-check" size={12} /> 윌앤비전이 함께하는 안전 일터</div>
            <h1>모든 임직원의 안전과 건강을<br/>한 곳에서 관리합니다.</h1>
            <p>
              위험성평가 · MSDS · 안전교육 · 이행제출까지<br/>
              법정 의무 자료를 자동화합니다.
            </p>
          </div>

          <div className="login-brand-footer">
            ©2026 윌앤비전(주)
          </div>

          <div className="login-orbs">
            <span /><span /><span />
          </div>
        </div>
      </aside>

      {/* Right form panel */}
      <main className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-form-hd">
            <div className="login-mini-eyebrow">
              <Icon name="lock" size={11} /> 보안 로그인
            </div>
            <h2>로그인</h2>
            <p>등록된 계정으로 로그인하세요.</p>
          </div>

          <form className="login-form" onSubmit={submit}>
            <label className="login-field">
              <span>아이디</span>
              <div className="login-input-wrap">
                <Icon name="user" size={14} />
                <input type="text" autoComplete="username"
                  placeholder="아이디 입력"
                  value={email} onChange={e => setEmail(e.target.value)} autoFocus />
              </div>
            </label>

            <label className="login-field">
              <span>비밀번호</span>
              <div className="login-input-wrap">
                <Icon name="lock" size={14} />
                <input type={showPw ? "text" : "password"} autoComplete="current-password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" className="login-input-action" onClick={() => setShowPw(s => !s)}>
                  <Icon name="eye" size={14} />
                </button>
              </div>
            </label>

            <div className="login-row-sm">
              <label className="login-check">
                <input type="checkbox" /> <span>로그인 상태 유지</span>
              </label>
              <button type="button" className="login-link" onClick={() => setForgotOpen(true)}>비밀번호 찾기</button>
            </div>

            {warn && !error && (
              <div className="login-warn" role="alert">
                <Icon name="alert" size={13} /> {warn}
              </div>
            )}
            {error && (
              <div className="login-error" role="alert">
                <Icon name="alert" size={13} /> {error}
              </div>
            )}

            {demo && (
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, color: "#1e40af", lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>🎯 포트폴리오 데모</div>
                아이디 <b>demo@demo.com</b> / 비번 <b>demo1234</b>
                <button type="button" onClick={fillDemo}
                  style={{ display: "block", marginTop: 8, width: "100%", padding: "7px 0", border: "1px solid #1e40af", borderRadius: 6, background: "#fff", color: "#1e40af", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
                  데모 계정으로 자동 입력
                </button>
              </div>
            )}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? <span className="login-spinner" /> : <><Icon name="arrow" size={14} /> 로그인</>}
            </button>

                <div className="login-help">
                  계정이 없으신가요? <button type="button" className="login-link" onClick={() => setMode("register")}>회원가입 신청</button>
                </div>
          </form>


        </div>
      </main>

      {forgotOpen && <ForgotPasswordModal onClose={() => setForgotOpen(false)} onPolicy={() => { setForgotOpen(false); setPolicyOpen(true); }} />}
      {policyOpen && <PasswordPolicyModal onClose={() => setPolicyOpen(false)} />}

      <style>{`
        .login-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          background: var(--bg);
        }
        @media (max-width: 900px) { .login-page { grid-template-columns: 1fr; } .login-brand { display: none; } }

        .login-brand {
          position: relative;
          background:
            radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 60%),
            radial-gradient(80% 70% at 100% 100%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 65%),
            linear-gradient(160deg, color-mix(in oklab, var(--primary) 92%, #000) 0%, color-mix(in oklab, var(--primary) 60%, #0a1a3a) 100%);
          color: #fff;
          overflow: hidden;
          padding: 56px;
          display: flex;
        }
        [data-mood="warm"] .login-brand {
          background:
            radial-gradient(110% 70% at 0% 0%, rgba(255,210,150,.32), transparent 60%),
            linear-gradient(160deg, #2a1d12 0%, #3a2616 50%, #5a3a22 100%);
        }
        [data-mood="technical"] .login-brand {
          background: linear-gradient(180deg, #0a1224 0%, #0f1830 100%);
        }
        [data-mood="technical"] .login-brand::after {
          content: ""; position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }
        .login-brand-inner {
          position: relative; z-index: 2;
          display: flex; flex-direction: column;
          width: 100%; max-width: 560px;
          margin: auto 0;
        }
        .login-orbs span {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.5), rgba(255,255,255,0) 60%);
          filter: blur(40px); opacity: .5; pointer-events: none;
        }
        .login-orbs span:nth-child(1) { width: 320px; height: 320px; top: -80px; left: -80px; }
        .login-orbs span:nth-child(2) { width: 220px; height: 220px; bottom: 10%; right: -40px; }
        .login-orbs span:nth-child(3) { width: 160px; height: 160px; top: 40%; left: 20%; opacity: .3; }

        .login-brand-mark { display: flex; align-items: center; gap: 12px; margin-bottom: 80px; }
        .login-brand-logo {
          width: 44px; height: 44px;
          object-fit: contain;
          background: #fff;
          border-radius: 10px;
          padding: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .login-brand-name { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
        .login-brand-sub  { font-size: 12px; opacity: .7; }
        .login-brand-pitch h1 { font-size: 40px; font-weight: 700; letter-spacing: -0.025em; line-height: 1.2; margin: 14px 0 16px; }
        [data-mood="warm"] .login-brand-pitch h1 { font-weight: 600; }
        [data-mood="technical"] .login-brand-pitch h1 { font-size: 32px; font-weight: 600; letter-spacing: -0.015em; }
        .login-brand-pitch p { color: rgba(255,255,255,.7); font-size: 14.5px; line-height: 1.65; margin: 0; max-width: 460px; }
        .login-brand-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 500; color: rgba(255,255,255,.85);
          padding: 5px 10px; border-radius: 999px;
          background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18);
          -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
          white-space: nowrap;
        }
        [data-mood="technical"] .login-brand-eyebrow { font-family: var(--font-mono); border-radius: 4px; }
        .login-brand-stats { display: flex; gap: 48px; margin-top: 64px; padding-top: 28px; border-top: 1px solid rgba(255,255,255,.14); }
        .login-brand-stats > div { display: flex; flex-direction: column; gap: 4px; }
        .login-brand-stats b { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
        [data-mood="technical"] .login-brand-stats b { font-family: var(--font-mono); }
        .login-brand-stats span { font-size: 12px; color: rgba(255,255,255,.65); }
        .login-brand-footer { margin-top: auto; padding-top: 80px; font-size: 11.5px; color: rgba(255,255,255,.45); }
        [data-mood="technical"] .login-brand-footer { font-family: var(--font-mono); }

        .login-form-panel {
          padding: 48px; display: grid; place-items: center;
          background: var(--bg); overflow-y: auto;
        }
        .login-form-wrap { width: 100%; max-width: 440px; }
        .login-form-hd { margin-bottom: 22px; }
        .login-mini-eyebrow {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 500; color: var(--primary);
          background: var(--primary-soft); border: 1px solid var(--primary-soft-2);
          padding: 3px 9px; border-radius: 999px; white-space: nowrap;
        }
        [data-mood="technical"] .login-mini-eyebrow { font-family: var(--font-mono); border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
        .login-form-hd h2 { font-size: 30px; font-weight: 700; letter-spacing: -0.02em; margin: 14px 0 6px; }
        [data-mood="warm"] .login-form-hd h2 { font-weight: 600; }
        [data-mood="technical"] .login-form-hd h2 { font-size: 24px; font-weight: 600; }
        .login-form-hd p { color: var(--fg-3); margin: 0; font-size: 14px; }

        /* Tabs */
        .login-tabs {
          position: relative;
          display: grid; grid-template-columns: 1fr 1fr;
          background: var(--bg-sunk);
          padding: 4px; border-radius: var(--r-md);
          margin-bottom: 22px;
        }
        .login-tabs button {
          position: relative; z-index: 2;
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          height: 36px; border: 0; background: transparent;
          font-size: 13px; font-weight: 500; color: var(--fg-3);
          border-radius: calc(var(--r-md) - 2px);
          transition: color .2s ease;
          cursor: pointer;
        }
        .login-tabs button.active { color: var(--fg); font-weight: 600; }
        .login-tabs-thumb {
          position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px);
          background: var(--bg-elev); border-radius: calc(var(--r-md) - 2px);
          box-shadow: var(--shadow);
          transition: transform .25s cubic-bezier(.2,.9,.3,1);
          z-index: 1;
        }
        .login-tabs-thumb[data-tab="external"] { transform: translateX(100%); }

        .login-form { display: flex; flex-direction: column; gap: 14px; }
        .login-field { display: flex; flex-direction: column; gap: 6px; }
        .login-field > span { font-size: 12.5px; font-weight: 600; color: var(--fg-2); }
        .login-input-wrap {
          display: flex; align-items: center; gap: 10px;
          padding: 0 14px; height: 46px;
          border-radius: var(--r-md);
          border: 1px solid var(--line);
          background: var(--bg-elev);
          color: var(--fg-3);
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .login-input-wrap:focus-within { border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-soft); color: var(--primary); }
        .login-input-wrap input { flex: 1; min-width: 0; border: 0; background: transparent; outline: none; color: var(--fg); font-size: 14px; }
        .login-input-wrap input::placeholder { color: var(--fg-4); }
        .login-input-action { background: transparent; border: 0; padding: 4px; color: var(--fg-3); cursor: pointer; display: grid; place-items: center; }

        .login-row-sm { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; margin-top: 2px; }
        .login-check { display: inline-flex; align-items: center; gap: 6px; color: var(--fg-3); cursor: pointer; white-space: nowrap; }
        .login-link {
          background: transparent; border: 0; padding: 0;
          color: var(--primary); font-weight: 500; white-space: nowrap;
          cursor: pointer; font-size: inherit; font-family: inherit;
        }
        .login-link:hover { text-decoration: underline; }

        .login-warn, .login-error {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 10px 12px; border-radius: var(--r-md); font-size: 12.5px;
          line-height: 1.45;
        }
        .login-warn {
          background: color-mix(in oklab, var(--warning) 12%, transparent);
          color: var(--warning);
          border: 1px solid color-mix(in oklab, var(--warning) 28%, transparent);
        }
        .login-error {
          background: color-mix(in oklab, var(--danger) 8%, transparent);
          color: var(--danger);
          border: 1px solid color-mix(in oklab, var(--danger) 20%, transparent);
        }

        .login-submit {
          height: 48px;
          background: var(--primary); color: var(--primary-fg);
          border: 0; border-radius: var(--r-md);
          font-size: 14.5px; font-weight: 600; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          transition: filter .15s ease, transform .1s ease;
          margin-top: 6px;
          white-space: nowrap;
        }
        .login-submit:hover:not(:disabled) { filter: brightness(1.06); }
        .login-submit:active { transform: translateY(1px); }
        .login-submit:disabled { opacity: .8; cursor: progress; }
        .login-spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; animation: login-spin .8s linear infinite; }
        @keyframes login-spin { to { transform: rotate(360deg); } }

        .login-divider { display: flex; align-items: center; gap: 12px; color: var(--fg-4); font-size: 11px; margin: 4px 0; }
        .login-divider::before, .login-divider::after { content: ""; flex: 1; height: 1px; background: var(--line); }

        .login-sso {
          height: 46px;
          background: var(--bg-elev); color: var(--fg);
          border: 1px solid var(--line); border-radius: var(--r-md);
          font-size: 13.5px; font-weight: 500; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          padding: 0 14px; white-space: nowrap;
        }
        .login-sso:hover { background: var(--bg-sunk); }
        .login-sso-ico {
          width: 22px; height: 22px; border-radius: 5px;
          background: linear-gradient(135deg, #e8307a, #c8da16 50%, #2ab8e6);
          display: grid; place-items: center;
          color: #fff; font-weight: 700; font-size: 11px;
        }

        .login-signup-cta {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px;
          background: var(--primary-soft);
          border: 1px solid var(--primary-soft-2);
          border-radius: var(--r-md); text-align: left;
          color: var(--primary); cursor: pointer;
          transition: background-color .15s ease;
        }
        .login-signup-cta:hover { background: color-mix(in oklab, var(--primary) 18%, transparent); }
        .login-signup-cta-title { font-weight: 600; font-size: 14px; }
        .login-signup-cta-sub { font-size: 11.5px; color: var(--fg-3); margin-top: 3px; }
        .login-signup-cta > div { flex: 1; }

        .login-help { text-align: center; font-size: 12.5px; color: var(--fg-3); margin-top: 6px; }

        .login-demo {
          margin-top: 28px; padding-top: 20px;
          border-top: 1px dashed var(--line);
        }
        .login-demo-hd { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
        .login-demo-grid { display: grid; gap: 8px; }
        .login-demo-card {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px;
          background: var(--bg-elev); border: 1px solid var(--line); border-radius: var(--r-md);
          text-align: left; cursor: pointer;
        }
        .login-demo-card:hover { background: var(--bg-sunk); border-color: var(--primary-soft-2); }
        .login-demo-avatar { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-weight: 600; font-size: 12px; flex-shrink: 0; }
        .login-demo-body { flex: 1; min-width: 0; }
        .login-demo-name { font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 8px; }
        .login-demo-role { font-size: 10.5px; font-weight: 500; padding: 1px 7px; border-radius: 999px; background: var(--bg-sunk); color: var(--fg-3); border: 1px solid var(--line-2); }
        [data-mood="technical"] .login-demo-role { font-family: var(--font-mono); border-radius: 3px; text-transform: uppercase; }
        .login-demo-email { font-size: 11.5px; color: var(--fg-4); margin-top: 2px; }
        [data-mood="technical"] .login-demo-email { font-family: var(--font-mono); }
      `}</style>
    </div>
  );
};

// ─── 비밀번호 찾기 모달
const ForgotPasswordModal = ({ onClose, onPolicy }) => {
  const [step, setStep] = React.useState("input"); // input | sent
  const [email, setEmail] = React.useState("");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-hd">
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>비밀번호 찾기</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-bd">
          {step === "input" ? (
            <>
              <p className="meta" style={{ marginTop: 0, lineHeight: 1.55 }}>
                가입 시 등록한 이메일을 입력해 주세요. 비밀번호 재설정 링크와 함께 계정 잠금이 해제됩니다.
              </p>
              <div className="field">
                <label className="field-label">이메일</label>
                <input className="field-input" type="email" placeholder="name@willnvision.co.kr"
                  value={email} onChange={e => setEmail(e.target.value)} autoFocus />
              </div>
              <div className="meta" style={{ marginTop: 8 }}>
                <Icon name="shield-check" size={11} /> 외부 사용자는 사내 담당자 검토 후 발송됩니다.
              </div>
            </>
          ) : (
            <div style={{textAlign: "center", padding: "12px 0"}}>
              <div style={{display: "inline-grid", placeItems: "center", width: 56, height: 56, borderRadius: "50%", background: "color-mix(in oklab, var(--success) 15%, transparent)", color: "var(--success)", marginBottom: 14}}>
                <Icon name="check-circle" size={28} />
              </div>
              <h3 style={{margin: "0 0 8px", fontSize: 17, fontWeight: 600}}>안내 메일을 발송했습니다</h3>
              <p className="meta" style={{maxWidth: 320, margin: "0 auto", lineHeight: 1.55}}>
                <b style={{color: "var(--fg-2)"}}>{email || "—"}</b> 으로 비밀번호 재설정 링크를 발송했습니다.
                메일이 도착하지 않으면 스팸함을 확인해 주세요.
              </p>
              <button className="login-link" style={{marginTop: 14, fontSize: 12.5}} onClick={onPolicy}>비밀번호 정책 보기 →</button>
            </div>
          )}
        </div>
        <div className="modal-ft">
          {step === "input" ? (
            <>
              <button className="btn btn-secondary" onClick={onClose}>취소</button>
              <button className="btn btn-primary" disabled={!email} onClick={() => setStep("sent")}>
                <Icon name="arrow" size={14} /> 재설정 링크 발송
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onClose}>확인</button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── 비밀번호 정책 모달
const PasswordPolicyModal = ({ onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
      <div className="modal-hd">
        <div>
          <div className="meta">계정 보안 정책</div>
          <h2 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 600 }}>비밀번호 및 계정 정책</h2>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
      </div>
      <div className="modal-bd">
        <div className="policy-section">
          <div className="policy-section-hd"><Icon name="lock" size={14} /> 비밀번호 요구사항</div>
          <ul className="policy-list">
            <li><b>최소 8자 이상</b></li>
            <li><b>영문 대문자</b> 1자 이상</li>
            <li><b>영문 소문자</b> 1자 이상</li>
            <li><b>숫자</b> 1자 이상</li>
            <li><b>특수문자</b> (! @ # $ % ^ & *) 1자 이상</li>
            <li>최근 사용한 4개 비밀번호와 중복 불가</li>
          </ul>
        </div>
        <div className="policy-section">
          <div className="policy-section-hd"><Icon name="refresh" size={14} /> 변경 주기</div>
          <ul className="policy-list">
            <li><b>90일마다</b> 비밀번호 변경 안내</li>
            <li>변경 기한 7일 전부터 로그인 시 알림 표시</li>
            <li>120일 경과 시 강제 변경 화면 노출</li>
          </ul>
        </div>
        <div className="policy-section">
          <div className="policy-section-hd"><Icon name="shield" size={14} /> 계정 잠금 / 휴면</div>
          <ul className="policy-list">
            <li>로그인 <b>5회 연속 실패</b> 시 계정 잠금 (비밀번호 찾기로 해제)</li>
            <li><b>90일 이상 미접속</b> 시 휴면 계정 전환 — 관리자에게 해제 요청</li>
            <li><b>180일 이상 미접속</b> 시 자동 비활성화</li>
          </ul>
        </div>
        <div className="policy-section">
          <div className="policy-section-hd"><Icon name="external-link" size={14} /> 외부 사용자 추가 정책</div>
          <ul className="policy-list">
            <li>계정 <b>유효기간 1년</b> — 만료 7일 전 이메일 안내 발송</li>
            <li>사내 담당자가 [연장] 처리해야 계속 사용 가능</li>
            <li>승인된 카테고리/자료에만 접근 가능</li>
            <li>모든 다운로드/업로드는 감사 로그에 기록됨</li>
          </ul>
        </div>
      </div>
      <div className="modal-ft">
        <button className="btn btn-primary" onClick={onClose}>확인</button>
      </div>

      <style>{`
        .policy-section + .policy-section { margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--line-2); }
        .policy-section-hd {
          display: inline-flex; align-items: center; gap: 8px;
          font-weight: 600; font-size: 13.5px;
          color: var(--fg);
          margin-bottom: 10px;
        }
        .policy-section-hd > svg { color: var(--primary); }
        .policy-list {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 6px;
          font-size: 13px; color: var(--fg-2); line-height: 1.55;
        }
        .policy-list li { position: relative; padding-left: 18px; }
        .policy-list li::before {
          content: ""; position: absolute; left: 6px; top: 8px;
          width: 4px; height: 4px; border-radius: 50%;
          background: var(--fg-4);
        }
      `}</style>
    </div>
  </div>
);

// ─── 회원가입 화면 (관리자 승인형) ───────────────────────────────────────────
const HQ_CHIP_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

// 회원가입 페이지 공통 wrapper CSS (done 화면 & 폼 화면 둘 다 사용)
const SHARED_REG_PAGE_CSS = `
  .reg-page {
    min-height: 100vh;
    background:
      radial-gradient(60% 50% at 20% 0%, color-mix(in oklab, var(--primary) 5%, transparent), transparent 70%),
      radial-gradient(60% 50% at 80% 100%, color-mix(in oklab, var(--primary) 4%, transparent), transparent 70%),
      var(--bg-sunk);
    display: flex; flex-direction: column;
    align-items: center;
    padding: 28px 20px 40px;
  }
  .reg-top-brand {
    display: inline-flex; align-items: center; gap: 12px;
    padding: 10px 14px;
    border-radius: 12px;
    background: var(--bg-elev);
    border: 1px solid var(--line);
    margin-bottom: 28px;
    box-shadow: 0 4px 18px -10px rgba(15,23,42,.10);
  }
  .reg-top-name { font-weight: 700; font-size: 14px; letter-spacing: -0.01em; color: var(--fg); }
  .reg-top-sub { font-size: 11px; color: var(--fg-3); margin-top: 1px; }
  .reg-stage {
    width: 100%;
    display: flex; justify-content: center;
    flex: 1;
  }
  .reg-foot {
    margin-top: 32px; padding-top: 24px;
    font-size: 11.5px; color: var(--fg-4);
    text-align: center;
  }
`;

const RegisterScreen = ({ onBack }) => {
  const [form, setForm] = React.useState({
    name: "", email: "", password: "", passwordConfirm: "",
    dept: "", phone: "", hqId: "", position: "",
  });
  const [hqs, setHQs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState(false);
  const [showPw, setShowPw] = React.useState(false);
  const upd = (k, v) => setForm(s => ({ ...s, [k]: v }));

  // 본부 목록 로드 (가입 시 선택)
  React.useEffect(() => {
    if (window.WV_API && typeof window.WV_API.getHQs === "function") {
      window.WV_API.getHQs()
        .then(data => setHQs(Array.isArray(data) ? data : []))
        .catch(() => setHQs([]));
    }
  }, []);

  // 비밀번호 강도 측정 (0=없음, 1=약함, 2=보통, 3=강함)
  const pwStrength = React.useMemo(() => {
    const p = form.password || "";
    if (!p) return 0;
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10 && /[a-zA-Z]/.test(p) && /\d/.test(p)) score++;
    if (p.length >= 12 && /[!@#$%^&*()_+\-=\[\]{}.,?]/.test(p)) score++;
    return score;
  }, [form.password]);

  const pwMatch = form.password && form.passwordConfirm
    ? (form.password === form.passwordConfirm ? "ok" : "no") : "";

  const pwStrengthInfo = [
    { color: "var(--fg-4)", label: "" },
    { color: "var(--danger)", label: "약함 — 더 길게 입력해 주세요" },
    { color: "var(--warning)", label: "보통 — 영문/숫자 조합 권장" },
    { color: "var(--success)", label: "강함 — 안전한 비밀번호입니다" },
  ][pwStrength];

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("이름을 입력해주세요."); return; }
    if (!form.email.trim()) { setError("아이디를 입력해주세요."); return; }
    if (form.email.length < 3) { setError("아이디는 3자 이상이어야 합니다."); return; }
    if (!form.password) { setError("비밀번호를 입력해주세요."); return; }
    if (form.password.length < 6) { setError("비밀번호는 6자 이상이어야 합니다."); return; }
    if (form.password !== form.passwordConfirm) { setError("비밀번호가 일치하지 않습니다."); return; }

    setLoading(true);
    try {
      const res = await window.WV_API.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        dept: form.dept.trim(),
        phone: form.phone.trim(),
        hqId: form.hqId || null,
        position: form.position.trim(),
        role: "staff",
      });
      if (res && res.success) {
        setDone(true);
      } else {
        setError((res && res.error) || "가입 신청에 실패했습니다.");
      }
    } catch (err) {
      setError("서버 연결 실패. 잠시 후 다시 시도해 주세요.");
    }
    setLoading(false);
  };

  // ─── 신청 완료 화면 ───────────────────────────────
  if (done) {
    return (
      <div className="reg-page">
        <div className="reg-top-brand">
          <img src="assets/logo-will-vision2.png" alt="윌앤비전 로고" style={{ width: 30, height: 30, objectFit: "contain", flexShrink: 0 }} />
          <div>
            <div className="reg-top-name">Will&amp;Vision</div>
            <div className="reg-top-sub">통합 안전보건 플랫폼</div>
          </div>
        </div>
        <main className="reg-stage">
          <div className="reg-done-card">
            <div className="reg-done-icon">
              <Icon name="check-circle" size={36} />
            </div>
            <h2>가입 신청이 완료되었습니다</h2>
            <p>
              관리자가 신청 내용을 검토한 후 승인합니다.<br/>
              승인 완료 시 별도 안내가 이루어지며, 그 전에는 로그인할 수 없습니다.
            </p>
            <div className="reg-done-box">
              <div className="reg-done-box-label">신청한 아이디</div>
              <div className="reg-done-box-value">{form.email}</div>
            </div>
            <div className="reg-done-timeline">
              <div className="reg-tl-step done">
                <div className="reg-tl-dot"><Icon name="check" size={11} /></div>
                <div className="reg-tl-text">신청 접수</div>
              </div>
              <div className="reg-tl-line" />
              <div className="reg-tl-step current">
                <div className="reg-tl-dot"><span className="reg-tl-pulse" /></div>
                <div className="reg-tl-text">관리자 검토</div>
              </div>
              <div className="reg-tl-line" />
              <div className="reg-tl-step">
                <div className="reg-tl-dot" />
                <div className="reg-tl-text">로그인 가능</div>
              </div>
            </div>
            <button className="reg-submit" onClick={onBack} style={{ width: "100%" }}>
              <Icon name="arrow" size={14} /> 로그인 화면으로
            </button>
          </div>
        </main>
        <footer className="reg-foot">©2026 Will&amp;Vision Co., Ltd.</footer>

        <style>{`
          ${SHARED_REG_PAGE_CSS}
          .reg-done-card {
            width: 100%; max-width: 480px;
            background: var(--bg-elev);
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 40px 36px;
            box-shadow: 0 12px 40px -16px rgba(0,0,0,.18);
            text-align: center;
          }
          .reg-done-icon {
            display: inline-grid; place-items: center;
            width: 76px; height: 76px; border-radius: 50%;
            background: color-mix(in oklab, var(--success) 14%, transparent);
            color: var(--success); margin: 0 auto 18px;
            box-shadow: 0 6px 28px -10px color-mix(in oklab, var(--success) 50%, transparent);
          }
          .reg-done-card h2 { font-size: 22px; font-weight: 700; margin: 0 0 10px; letter-spacing: -0.015em; }
          .reg-done-card p { color: var(--fg-3); line-height: 1.6; margin: 0 0 22px; font-size: 13.5px; }
          .reg-done-box {
            padding: 14px 16px; margin-bottom: 22px;
            background: var(--bg-sunk); border-radius: 10px;
            border: 1px dashed var(--line); text-align: left;
          }
          .reg-done-box-label { font-size: 11px; color: var(--fg-3); margin-bottom: 4px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
          .reg-done-box-value { font-family: var(--font-mono, monospace); font-weight: 600; font-size: 14px; color: var(--fg); }

          .reg-done-timeline {
            display: flex; align-items: center; justify-content: center;
            gap: 0; margin: 8px 0 26px;
            padding: 16px 0; border-top: 1px solid var(--line-2); border-bottom: 1px solid var(--line-2);
          }
          .reg-tl-step { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 80px; }
          .reg-tl-dot {
            width: 22px; height: 22px; border-radius: 50%;
            display: grid; place-items: center;
            background: var(--bg-sunk); border: 2px solid var(--line);
            color: var(--fg-4);
          }
          .reg-tl-step.done .reg-tl-dot { background: var(--success); border-color: var(--success); color: #fff; }
          .reg-tl-step.current .reg-tl-dot { background: color-mix(in oklab, var(--primary) 12%, transparent); border-color: var(--primary); position: relative; }
          .reg-tl-pulse {
            display: block; width: 8px; height: 8px; border-radius: 50%; background: var(--primary);
            animation: reg-pulse 1.8s ease-in-out infinite;
          }
          @keyframes reg-pulse {
            0%, 100% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--primary) 50%, transparent); }
            50% { box-shadow: 0 0 0 8px color-mix(in oklab, var(--primary) 0%, transparent); }
          }
          .reg-tl-text { font-size: 11.5px; font-weight: 500; color: var(--fg-3); white-space: nowrap; }
          .reg-tl-step.done .reg-tl-text { color: var(--success); font-weight: 600; }
          .reg-tl-step.current .reg-tl-text { color: var(--primary); font-weight: 700; }
          .reg-tl-line { flex: 0 0 30px; height: 2px; background: var(--line); margin-top: -22px; }
        `}</style>
      </div>
    );
  }

  // ─── 가입 신청 폼 화면 ───────────────────────────────
  return (
    <div className="reg-page">
      <div className="reg-top-brand">
        <img src="assets/logo-will-vision2.png" alt="윌앤비전 로고" style={{ width: 30, height: 30, objectFit: "contain", flexShrink: 0 }} />
        <div>
          <div className="reg-top-name">Will&amp;Vision</div>
          <div className="reg-top-sub">통합 안전보건 플랫폼</div>
        </div>
      </div>

      <main className="reg-stage">
        <div className="reg-wrap">
          {/* 상단 뒤로가기 — 사이트 공통 .bcr 패턴 */}
          <div className="bcr" onClick={onBack}>
            <Icon name="arrow-left" size={14} /> 로그인 화면으로
          </div>

          {/* 헤더 + 미니 진행 단계 */}
          <div className="reg-hd">
            <div className="login-mini-eyebrow"><Icon name="user-plus" size={11} /> 회원가입</div>
            <h2>가입 신청</h2>
            <p>신청 후 관리자 승인을 받으면 로그인할 수 있습니다.</p>
          </div>

          {/* 가입 진행 단계 인디케이터 */}
          <div className="reg-progress">
            <div className="reg-pg-item current">
              <span className="reg-pg-num">1</span>
              <span className="reg-pg-text">신청서 작성</span>
            </div>
            <span className="reg-pg-arrow"><Icon name="chevron-right" size={12} /></span>
            <div className="reg-pg-item">
              <span className="reg-pg-num">2</span>
              <span className="reg-pg-text">관리자 승인</span>
            </div>
            <span className="reg-pg-arrow"><Icon name="chevron-right" size={12} /></span>
            <div className="reg-pg-item">
              <span className="reg-pg-num">3</span>
              <span className="reg-pg-text">로그인 가능</span>
            </div>
          </div>

          <form className="reg-form" onSubmit={handleSubmit}>
            {/* ─── 섹션 1: 계정 정보 ─── */}
            <section className="reg-section">
              <header className="reg-sec-hd">
                <span className="reg-sec-num">1</span>
                <div>
                  <div className="reg-sec-title">계정 정보</div>
                  <div className="reg-sec-sub">로그인 시 사용할 정보를 입력해 주세요</div>
                </div>
              </header>

              <div className="reg-grid-2">
                <label className="login-field">
                  <span>이름 *</span>
                  <div className="login-input-wrap">
                    <Icon name="user" size={14} />
                    <input type="text" placeholder="홍길동" value={form.name}
                      onChange={e => upd("name", e.target.value)} autoFocus />
                    {form.name.trim() && <span className="reg-input-ok"><Icon name="check" size={11} /></span>}
                  </div>
                </label>

                <label className="login-field">
                  <span>아이디 (로그인 ID) *</span>
                  <div className="login-input-wrap">
                    <Icon name="at-sign" size={14} />
                    <input type="text" placeholder="예: hong_kd" autoComplete="username"
                      value={form.email} onChange={e => upd("email", e.target.value)} />
                    {form.email.trim().length >= 3 && <span className="reg-input-ok"><Icon name="check" size={11} /></span>}
                  </div>
                </label>
              </div>

              <div className="reg-grid-2">
                <label className="login-field">
                  <span>비밀번호 *</span>
                  <div className="login-input-wrap">
                    <Icon name="lock" size={14} />
                    <input type={showPw ? "text" : "password"} placeholder="6자 이상" autoComplete="new-password"
                      value={form.password} onChange={e => upd("password", e.target.value)} />
                    <button type="button" className="login-input-action" onClick={() => setShowPw(s => !s)}>
                      <Icon name="eye" size={14} />
                    </button>
                  </div>
                  {/* 비밀번호 강도 미터 */}
                  {form.password && (
                    <div className="reg-pw-meter">
                      <div className="reg-pw-bars">
                        {[1, 2, 3].map(i => (
                          <span key={i} className={`reg-pw-bar ${pwStrength >= i ? "on" : ""}`}
                            style={{ background: pwStrength >= i ? pwStrengthInfo.color : undefined }} />
                        ))}
                      </div>
                      <span className="reg-pw-label" style={{ color: pwStrengthInfo.color }}>{pwStrengthInfo.label}</span>
                    </div>
                  )}
                </label>

                <label className="login-field">
                  <span>비밀번호 확인 *</span>
                  <div className="login-input-wrap">
                    <Icon name="lock" size={14} />
                    <input type={showPw ? "text" : "password"} placeholder="다시 입력" autoComplete="new-password"
                      value={form.passwordConfirm} onChange={e => upd("passwordConfirm", e.target.value)} />
                    {pwMatch === "ok" && <span className="reg-input-ok"><Icon name="check" size={11} /></span>}
                    {pwMatch === "no" && <span className="reg-input-no"><Icon name="x" size={11} /></span>}
                  </div>
                  {pwMatch === "no" && (
                    <div className="reg-field-hint" style={{ color: "var(--danger)" }}>
                      <Icon name="alert" size={11} /> 비밀번호가 일치하지 않습니다
                    </div>
                  )}
                  {pwMatch === "ok" && (
                    <div className="reg-field-hint" style={{ color: "var(--success)" }}>
                      <Icon name="check-circle" size={11} /> 비밀번호가 일치합니다
                    </div>
                  )}
                </label>
              </div>
            </section>

            {/* ─── 섹션 2: 소속 정보 ─── */}
            <section className="reg-section">
              <header className="reg-sec-hd">
                <span className="reg-sec-num">2</span>
                <div>
                  <div className="reg-sec-title">소속 정보</div>
                  <div className="reg-sec-sub">소속된 본부를 선택하고 부서·연락처를 입력해 주세요</div>
                </div>
              </header>

              {/* 본부 칩 선택 */}
              <div className="reg-hq-pick">
                <div className="reg-hq-label">소속 본부 <span className="reg-optional">(선택)</span></div>
                <div className="reg-hq-grid">
                  {hqs.map((h, idx) => {
                    const color = HQ_CHIP_COLORS[idx % HQ_CHIP_COLORS.length];
                    const selected = String(form.hqId) === String(h.id);
                    return (
                      <button key={h.id} type="button"
                        className={`reg-hq-chip ${selected ? "active" : ""}`}
                        style={{ "--chip-color": color }}
                        onClick={() => upd("hqId", selected ? "" : h.id)}>
                        <span className="reg-hq-code">{h.code || "HQ"}</span>
                        <span className="reg-hq-name">{h.name}</span>
                        {selected && <span className="reg-hq-check"><Icon name="check" size={12} /></span>}
                      </button>
                    );
                  })}
                  {hqs.length === 0 && (
                    <div className="reg-hq-empty">본부 목록을 불러오는 중...</div>
                  )}
                </div>
              </div>

              <div className="reg-grid-3">
                <label className="login-field">
                  <span>부서</span>
                  <div className="login-input-wrap">
                    <Icon name="users" size={14} />
                    <input type="text" placeholder="예: 안전팀" value={form.dept}
                      onChange={e => upd("dept", e.target.value)} />
                  </div>
                </label>
                <label className="login-field">
                  <span>직책</span>
                  <div className="login-input-wrap">
                    <Icon name="user" size={14} />
                    <input type="text" placeholder="예: 대리, 매니저" value={form.position}
                      onChange={e => upd("position", e.target.value)} />
                  </div>
                </label>
                <label className="login-field">
                  <span>연락처</span>
                  <div className="login-input-wrap">
                    <Icon name="phone" size={14} />
                    <input type="text" placeholder="010-0000-0000" value={form.phone}
                      onChange={e => upd("phone", e.target.value)} />
                  </div>
                </label>
              </div>
            </section>

            {/* 에러 표시 */}
            {error && (
              <div className="login-error" role="alert" style={{ marginTop: 4 }}>
                <Icon name="alert" size={13} /> {error}
              </div>
            )}

            {/* 제출 영역 */}
            <div className="reg-actions">
              <div className="reg-actions-info">
                <Icon name="shield-check" size={13} /> 입력된 정보는 가입 승인 검토 목적으로만 사용됩니다.
              </div>
              <button type="submit" className="login-submit reg-submit" disabled={loading}>
                {loading ? <span className="login-spinner" /> : <><Icon name="user-plus" size={15} /> 가입 신청하기</>}
              </button>
            </div>

            <div className="login-help">
              이미 계정이 있으신가요? <button type="button" className="login-link" onClick={onBack}>로그인 화면으로</button>
            </div>
          </form>
        </div>
      </main>
      <footer className="reg-foot">©2026 Will&amp;Vision Co., Ltd.</footer>

        <style>{`
          ${SHARED_REG_PAGE_CSS}
          .reg-wrap { width: 100%; max-width: 640px; margin: 0 auto; }

          .reg-back {
            display: inline-flex; align-items: center; gap: 5px;
            font-size: 12.5px; color: var(--fg-3);
            background: transparent; border: 0; padding: 6px 0;
            cursor: pointer; margin-bottom: 8px;
          }
          .reg-back:hover { color: var(--primary); }

          /* 가입 진행 단계 인디케이터 (3 step) */
          .reg-progress {
            display: flex; align-items: center; justify-content: center;
            gap: 6px; padding: 14px 18px;
            background: var(--bg-elev);
            border: 1px solid var(--line);
            border-radius: 12px;
            margin-bottom: 22px;
            flex-wrap: wrap;
          }
          .reg-pg-item {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 6px 10px; border-radius: 8px;
            font-size: 12.5px; color: var(--fg-3);
            transition: all .2s;
          }
          .reg-pg-num {
            display: grid; place-items: center;
            width: 22px; height: 22px; border-radius: 50%;
            background: var(--bg-sunk); color: var(--fg-3);
            font-size: 11px; font-weight: 700;
            border: 1.5px solid var(--line);
            flex-shrink: 0;
          }
          .reg-pg-text { font-weight: 500; }
          .reg-pg-item.current { background: color-mix(in oklab, var(--primary) 8%, transparent); color: var(--primary); }
          .reg-pg-item.current .reg-pg-num {
            background: var(--primary); color: var(--primary-fg, #fff);
            border-color: var(--primary);
            box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 15%, transparent);
          }
          .reg-pg-item.current .reg-pg-text { font-weight: 700; }
          .reg-pg-arrow { color: var(--fg-4); display: inline-flex; align-items: center; }

          .reg-hd { margin-bottom: 24px; }
          .reg-hd h2 { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; margin: 12px 0 6px; }
          .reg-hd p { color: var(--fg-3); margin: 0; font-size: 13.5px; }

          .reg-form { display: flex; flex-direction: column; gap: 22px; }

          /* ─── 섹션 카드: 떠 있는 미니멀 카드 ─── */
          .reg-section {
            position: relative;
            background: var(--bg-elev);
            border: 1px solid transparent;
            border-radius: 20px;
            padding: 26px 28px 28px;
            display: flex; flex-direction: column; gap: 18px;
            box-shadow:
              0 1px 2px rgba(15, 23, 42, 0.04),
              0 12px 36px -16px rgba(15, 23, 42, 0.10);
            transition: box-shadow .3s ease, border-color .2s ease, transform .2s ease;
          }
          .reg-section::before {
            /* 상단 미묘한 그라데이션 액센트 */
            content: ""; position: absolute; top: 0; left: 24px; right: 24px;
            height: 2px; border-radius: 2px;
            background: linear-gradient(90deg,
              color-mix(in oklab, var(--primary) 70%, transparent),
              color-mix(in oklab, var(--primary) 0%, transparent));
            opacity: 0; transition: opacity .25s;
          }
          .reg-section:focus-within {
            border-color: color-mix(in oklab, var(--primary) 22%, transparent);
            box-shadow:
              0 1px 2px rgba(15, 23, 42, 0.04),
              0 20px 56px -16px color-mix(in oklab, var(--primary) 28%, transparent);
            transform: translateY(-1px);
          }
          .reg-section:focus-within::before { opacity: 1; }

          .reg-sec-hd {
            display: flex; align-items: center; gap: 14px;
            padding-bottom: 14px; margin-bottom: 4px;
            border-bottom: 1px solid var(--line-2);
          }
          .reg-sec-num {
            width: 34px; height: 34px; border-radius: 11px;
            display: grid; place-items: center;
            background: linear-gradient(135deg, var(--primary), color-mix(in oklab, var(--primary) 65%, #fff));
            color: #fff;
            font-size: 14px; font-weight: 800;
            border: 0;
            flex-shrink: 0;
            box-shadow:
              0 1px 0 rgba(255,255,255,.4) inset,
              0 4px 14px -4px color-mix(in oklab, var(--primary) 55%, transparent);
          }
          .reg-sec-title { font-size: 15.5px; font-weight: 700; color: var(--fg); letter-spacing: -0.012em; }
          .reg-sec-sub { font-size: 12px; color: var(--fg-3); margin-top: 3px; line-height: 1.4; }

          .reg-grid-2 {
            display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
          }
          .reg-grid-3 {
            display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;
          }
          @media (max-width: 720px) {
            .reg-grid-2, .reg-grid-3 { grid-template-columns: 1fr; }
          }

          /* ─── 입력 필드: 사이트 통일 — 흰 배경 + 회색 보더 ─── */
          .reg-section .login-field { gap: 7px; }
          .reg-section .login-field > span {
            font-size: 12px; font-weight: 600;
            color: var(--fg-2);
            letter-spacing: 0.01em;
            margin-left: 2px;
          }
          .reg-section .login-input-wrap {
            display: flex; align-items: center; gap: 10px;
            background: var(--bg-elev);
            border: 1px solid var(--line);
            height: 46px; padding: 0 14px;
            border-radius: 10px;
            color: var(--fg-3);
            transition: border-color .15s ease, box-shadow .15s ease;
            overflow: hidden;
            position: relative;
            box-shadow: none;
          }
          .reg-section .login-input-wrap:hover {
            border-color: color-mix(in oklab, var(--primary) 30%, var(--line));
          }
          .reg-section .login-input-wrap:focus-within {
            border-color: var(--primary);
            box-shadow: 0 0 0 4px color-mix(in oklab, var(--primary) 12%, transparent);
            color: var(--primary);
          }
          /* 브라우저 default input 스타일 강제 제거 + 세로 가운데 정렬 */
          .reg-section .login-input-wrap input,
          .reg-section .login-input-wrap select,
          .reg-section .login-input-wrap textarea {
            flex: 1; min-width: 0; width: 100%;
            height: auto;
            margin: 0; padding: 0;
            border: 0 !important;
            background: transparent !important;
            background-color: transparent !important;
            outline: none !important;
            box-shadow: none !important;
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            font-size: 14px; font-weight: 500;
            color: var(--fg);
            font-family: inherit;
            line-height: 1.2;
          }
          .reg-section .login-input-wrap input::placeholder {
            color: var(--fg-4); font-weight: 400;
          }
          /* 자동완성 시 노란 배경 제거 */
          .reg-section .login-input-wrap input:-webkit-autofill,
          .reg-section .login-input-wrap input:-webkit-autofill:hover,
          .reg-section .login-input-wrap input:-webkit-autofill:focus {
            -webkit-box-shadow: 0 0 0 1000px var(--bg-elev) inset !important;
            -webkit-text-fill-color: var(--fg) !important;
            caret-color: var(--fg) !important;
            transition: background-color 5000s ease-in-out 0s;
          }
          /* 비번 표시 토글 버튼 — 박스 완전 제거 */
          .reg-section .login-input-action {
            background: transparent !important;
            background-color: transparent !important;
            border: 0 !important;
            outline: none !important;
            box-shadow: none !important;
            color: var(--fg-3);
            padding: 6px; border-radius: 6px;
            cursor: pointer;
            display: grid; place-items: center;
            transition: color .15s, background .15s;
            -webkit-appearance: none;
            appearance: none;
          }
          .reg-section .login-input-action:hover {
            background: color-mix(in oklab, var(--primary) 12%, transparent) !important;
            color: var(--primary);
          }

          /* ─── 비밀번호 강도 미터: 더 매끄럽게 ─── */
          .reg-pw-meter {
            display: flex; align-items: center; gap: 12px;
            margin-top: 8px; padding: 0 2px;
            font-size: 11.5px;
          }
          .reg-pw-bars { display: flex; gap: 4px; flex: 0 0 auto; }
          .reg-pw-bar {
            width: 36px; height: 5px; border-radius: 3px;
            background: var(--line);
            transition: background .3s ease, box-shadow .3s ease;
          }
          .reg-pw-bar.on {
            box-shadow: 0 0 8px -2px currentColor;
          }
          .reg-pw-label { font-weight: 600; letter-spacing: 0.01em; }

          .reg-field-hint {
            display: inline-flex; align-items: center; gap: 5px;
            font-size: 11.5px; margin-top: 6px;
            margin-left: 2px;
            font-weight: 500;
          }

          /* ─── 입력 완료 체크/엑스 — 본부 칩의 ✓ 와 동일 톤 ─── */
          .reg-input-ok, .reg-input-no {
            display: grid; place-items: center;
            width: 22px; height: 22px; border-radius: 50%;
            flex-shrink: 0;
            animation: reg-pop .25s cubic-bezier(.2,.9,.3,1.2);
          }
          .reg-input-ok {
            background: color-mix(in oklab, var(--success) 14%, transparent);
            color: var(--success);
            box-shadow: 0 0 0 1px color-mix(in oklab, var(--success) 22%, transparent);
          }
          .reg-input-no {
            background: color-mix(in oklab, var(--danger) 14%, transparent);
            color: var(--danger);
            box-shadow: 0 0 0 1px color-mix(in oklab, var(--danger) 22%, transparent);
          }
          @keyframes reg-pop {
            from { transform: scale(0); opacity: 0; }
            to   { transform: scale(1); opacity: 1; }
          }

          /* ─── 본부 칩 그리드 ─── */
          .reg-hq-pick { display: flex; flex-direction: column; gap: 8px; }
          .reg-hq-label {
            font-size: 12.5px; font-weight: 600; color: var(--fg-2);
            display: flex; align-items: center; gap: 6px;
          }
          .reg-optional { font-size: 11px; color: var(--fg-4); font-weight: 400; }
          .reg-hq-grid {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
          }
          @media (max-width: 720px) {
            .reg-hq-grid { grid-template-columns: repeat(2, 1fr); }
          }
          .reg-hq-chip {
            position: relative;
            display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
            padding: 10px 12px;
            background: var(--bg-elev);
            border: 1.5px solid var(--line);
            border-radius: 10px;
            cursor: pointer;
            transition: all .15s ease;
            text-align: left;
            min-height: 60px;
          }
          .reg-hq-chip:hover {
            border-color: var(--chip-color);
            background: color-mix(in oklab, var(--chip-color) 4%, var(--bg-elev));
          }
          .reg-hq-chip.active {
            border-color: var(--chip-color);
            background: color-mix(in oklab, var(--chip-color) 10%, var(--bg-elev));
            box-shadow: 0 0 0 3px color-mix(in oklab, var(--chip-color) 14%, transparent);
          }
          .reg-hq-code {
            font-size: 10px; font-weight: 800;
            color: var(--chip-color);
            padding: 2px 7px; border-radius: 4px;
            background: color-mix(in oklab, var(--chip-color) 12%, transparent);
            border: 1px solid color-mix(in oklab, var(--chip-color) 25%, transparent);
            letter-spacing: 0.04em;
          }
          .reg-hq-name { font-size: 12px; font-weight: 600; color: var(--fg); line-height: 1.3; }
          .reg-hq-check {
            position: absolute; top: 8px; right: 8px;
            width: 18px; height: 18px; border-radius: 50%;
            display: grid; place-items: center;
            background: var(--chip-color); color: #fff;
          }
          .reg-hq-empty {
            grid-column: 1 / -1; padding: 18px; text-align: center;
            color: var(--fg-4); font-size: 12px; font-style: italic;
          }

          /* ─── 모든 button reset (회원가입 화면 안) ─── */
          .reg-wrap button {
            font-family: inherit;
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
          }
          /* 텍스트 링크 (로그인 화면으로 등) — 박스 완전 제거 */
          .reg-wrap .login-link,
          .reg-wrap button.login-link {
            background: transparent !important;
            background-color: transparent !important;
            border: 0 !important;
            outline: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 2px;
            color: var(--primary);
            font-weight: 600;
            font-size: inherit;
            font-family: inherit;
            cursor: pointer;
            text-decoration: none;
          }
          .reg-wrap .login-link:hover,
          .reg-wrap button.login-link:hover { text-decoration: underline; }

          /* 뒤로가기 — 박스 제거 */
          .reg-back {
            background: transparent !important;
            background-color: transparent !important;
            border: 0 !important;
            outline: none !important;
            box-shadow: none !important;
          }

          /* ─── 액션 영역 ─── */
          .reg-actions {
            display: flex; flex-direction: column; gap: 10px;
            padding-top: 6px;
          }
          .reg-actions-info {
            display: inline-flex; align-items: center; gap: 6px;
            font-size: 11.5px; color: var(--fg-3); justify-content: center;
          }
          .reg-actions-info svg { color: var(--success); }

          /* 가입 신청 버튼 — primary 색상 강제 명시 */
          .reg-submit {
            background: var(--primary) !important;
            color: var(--primary-fg, #fff) !important;
            border: 0 !important;
            outline: none !important;
            height: 52px;
            font-size: 15px;
            font-weight: 600;
            border-radius: 12px;
            cursor: pointer;
            display: inline-flex; align-items: center; justify-content: center; gap: 8px;
            transition: filter .15s, transform .1s, box-shadow .2s;
            box-shadow: 0 8px 24px -10px color-mix(in oklab, var(--primary) 55%, transparent);
          }
          .reg-submit:hover:not(:disabled) {
            filter: brightness(1.06);
            box-shadow: 0 12px 32px -10px color-mix(in oklab, var(--primary) 65%, transparent);
          }
          .reg-submit:active { transform: translateY(1px); }
          .reg-submit:disabled { opacity: .7; cursor: progress; }

          /* login-help (이미 계정이 있으신가요?) 안의 잔여 박스 제거 */
          .reg-wrap .login-help {
            text-align: center;
            font-size: 13px;
            color: var(--fg-3);
            margin-top: 4px;
          }

        `}</style>
    </div>
  );
};

Object.assign(window, { LoginScreen, RegisterScreen, ForgotPasswordModal, PasswordPolicyModal });
