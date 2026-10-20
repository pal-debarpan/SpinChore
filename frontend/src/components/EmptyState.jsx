export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      {Icon ? <Icon className="mb-3 h-10 w-10 text-brand-500" aria-hidden="true" /> : null}
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-stone-600">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
