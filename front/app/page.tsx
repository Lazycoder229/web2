'use client'
import { login } from './auth/action';
import { useActionState } from 'react'; // Siguraduhing galing ito sa 'react'

export default function LoginForm() {
  // Ang state ay maglalaman ng ibinabalik na { success, error } mula sa login
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <form action={formAction}>
      <input name="username" placeholder="Username" />
    
      <input name="password" type="password" placeholder="Password" />
     
      
      {/* Magpapakita ng error kung meron man */}
      {state?.error && <p style={{ color: 'red' }}>{state.error}</p>}
      
      <button type="submit" disabled={isPending}>
        {isPending ? 'Logging in...' : 'Log in'}
      </button>
    </form>
  );
}
