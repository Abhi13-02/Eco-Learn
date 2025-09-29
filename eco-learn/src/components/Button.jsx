function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Button({
  children,
  href,
  variant = 'primary',
  className = '',
  ...props
}) {
  const base =
    'rounded-full font-medium px-6 py-3 transition-colors inline-flex items-center justify-center';

  const variants = {
    primary: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    outline: 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50',
    ghost: 'text-emerald-600 hover:bg-emerald-50',
  };

  const classes = classNames(base, variants[variant] || variants.primary, className);

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
