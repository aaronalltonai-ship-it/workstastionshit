"use client";

export default function IllcoPage() {
  return (
    <div className="illco-wrapper">
      <iframe
        src="/illcoai-ui.html"
        title="iLLcoAI Command Workspace"
        className="illco-frame"
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
      />
      <div className="illco-banner">
        <p>
          The iLLcoAI command workspace runs as a static, full-black experience. Use the tabs above to
          swap into the floating assistant hub without losing the rest of the app.
        </p>
      </div>
      <style jsx>{`
        .illco-wrapper {
          background: #05060a;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .illco-frame {
          border: none;
          flex: 1;
          width: 100%;
          min-height: 80vh;
        }
        .illco-banner {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px 24px;
          font-size: 0.85rem;
          color: #cbd5f5;
          background: rgba(15, 23, 42, 0.6);
          text-align: center;
        }
      `}</style>
    </div>
  );
}
