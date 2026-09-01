async function waitForCloud() {
  for (let i = 0; i < 120; i += 1) {
    if (window.supabaseClient && document.querySelector('.cloud-user-tools')) return window.supabaseClient;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return null;
}

const client = await waitForCloud();
if (client) {
  const { data: authData } = await client.auth.getUser();
  const user = authData?.user;
  if (user) {
    const { data: member } = await client.from('app_members').select('role').eq('user_id', user.id).maybeSingle();
    if (member?.role === 'admin') {
      const tools = document.querySelector('.cloud-user-tools');
      if (tools && !document.querySelector('#cloud-invite')) {
        const button = document.createElement('button');
        button.id = 'cloud-invite';
        button.type = 'button';
        button.className = 'cloud-logout';
        button.textContent = '利用者追加';
        tools.insertBefore(button, document.querySelector('#cloud-logout'));
        button.addEventListener('click', async () => {
          const email = prompt('追加する人のメールアドレスを入力してください。\nその人は同じメールアドレスで「初回アカウント作成」をします。');
          if (!email) return;
          const normalized = email.trim().toLowerCase();
          if (!/^\S+@\S+\.\S+$/.test(normalized)) {
            alert('メールアドレスを確認してください。');
            return;
          }
          const { error } = await client.from('app_invites').upsert({ email: normalized, created_by: user.id }, { onConflict: 'email' });
          if (error) {
            alert(`利用者を追加できませんでした。\n${error.message}`);
            return;
          }
          alert(`${normalized}\n\nこのメールアドレスを利用許可に追加しました。\n相手はうりあげノートを開き、このメールアドレスで「初回アカウント作成」をしてください。`);
        });
      }
    }
  }
}
