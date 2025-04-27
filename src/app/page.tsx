'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SomePage() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/chat');
  }, [router]);

  // Return an empty div or null - this won't be visible since we're redirecting
  return null;
}