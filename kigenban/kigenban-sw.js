const CACHE_NAME='kigenban-shell-v1';
self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch{data={body:event.data?event.data.text():''}}
  const title=data.title||'期限番';
  const options={
    body:data.body||'期限が近づいています。',
    tag:data.tag||'kigenban-deadline',
    renotify:true,
    data:data.data||{url:'./'},
    timestamp:data.timestamp||Date.now()
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'./',self.registration.scope).href;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      try{
        if(new URL(client.url).origin===new URL(target).origin){
          await client.focus();
          if('navigate' in client)await client.navigate(target);
          return;
        }
      }catch{}
    }
    if(self.clients.openWindow)return self.clients.openWindow(target);
  })());
});
