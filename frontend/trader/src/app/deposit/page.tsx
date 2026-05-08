import { redirect } from 'next/navigation';

/** Redirect — funding lives on /wallet in this app. */
export default function DepositPage() {
  redirect('/wallet');
}
