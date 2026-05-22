import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface UserProfileLinkProps {
  userId?: string | null;
  children: ReactNode;
  className?: string;
  stopPropagation?: boolean;
}

export function UserProfileLink({
  userId,
  children,
  className,
  stopPropagation = true,
}: UserProfileLinkProps) {
  if (!userId) {
    return <span className={className}>{children}</span>;
  }

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
  };

  return (
    <Link to={`/student/profile/${userId}`} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
