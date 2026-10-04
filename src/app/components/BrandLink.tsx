import Image from 'next/image';
import Link from 'next/link';

export default function BrandLink({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`midora-brand ${className}`.trim()} aria-label="Midora - trang chủ">
      <Image src="/brand/logo.png" alt="Logo Midora" width={500} height={500} priority />
      <span>Midora</span>
    </Link>
  );
}
