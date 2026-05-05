export default function WelcomeModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-night/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card corner-accents max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="label mb-4">// system :: welcome</div>
        <h2 className="display text-3xl sm:text-4xl leading-tight text-cream mb-5">
          BRO CODE.
        </h2>
        <p className="text-cream/85 leading-relaxed mb-3">
          The guys who show up don't do it by accident. They learn. They track. They adjust.
        </p>
        <p className="display text-red text-base mb-6">
          This is your playbook.
        </p>
        <button className="btn btn-primary w-full justify-center" onClick={onClose}>
          ENTER →
        </button>
      </div>
    </div>
  )
}
