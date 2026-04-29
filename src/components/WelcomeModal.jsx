export default function WelcomeModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-night/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card corner-accents max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="label mb-4">// system :: welcome</div>
        <h2 className="display text-3xl sm:text-4xl leading-tight text-cream mb-6">
          WELCOME TO BRO CODE.
        </h2>
        <p className="text-cream/85 leading-relaxed mb-3">
          This app exists because the guys who show up for their partners don't do it by accident.
        </p>
        <p className="text-cream/85 leading-relaxed mb-3">
          They learn. They track. They adjust.
        </p>
        <p className="display text-red text-lg mb-6">
          This is your playbook. Know the code.
        </p>
        <button className="btn btn-primary w-full justify-center" onClick={onClose}>
          ENTER →
        </button>
      </div>
    </div>
  )
}
