export default function AuthCard({ title, children, footer }) {
  return (
    <div className="bg-white/40 backdrop-blur-md rounded-2xl shadow-lg w-[320px] sm:w-[400px] p-8">
      <h2 className="text-xl font-bold text-center mb-6 text-sky-700">
        {title}
      </h2>
      {children}
      {footer && (
        <div className="text-center text-sm mt-4 text-gray-700">{footer}</div>
      )}
    </div>
  );
}
