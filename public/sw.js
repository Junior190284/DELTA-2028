self.addEventListener("install",event=>{
  self.skipWaiting();
});

self.addEventListener("activate",event=>{
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push",event=>{
  let data={
    title:"DELTA 2018 GM",
    body:"Nowe powiadomienie drużyny",
    url:"/dashboard?view=club",
    tag:"delta-teamhub"
  };
  try{
    if(event.data)data={...data,...event.data.json()};
  }catch{}

  event.waitUntil(self.registration.showNotification(data.title,{
    body:data.body,
    icon:"/icons/delta-192.png",
    badge:"/icons/delta-badge-96.png",
    image:data.image||undefined,
    tag:data.tag||"delta-teamhub",
    renotify:true,
    requireInteraction:false,
    data:{url:data.url||"/dashboard?view=club"}
  }));
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const raw=event.notification.data?.url||"/dashboard?view=club";
  const target=new URL(raw,self.location.origin).href;

  event.waitUntil((async()=>{
    const windows=await clients.matchAll({type:"window",includeUncontrolled:true});
    // Prefer the already-open Team Hub window, but always navigate it first.
    for(const client of windows){
      try{
        if(new URL(client.url).origin===self.location.origin){
          if("navigate" in client) await client.navigate(target);
          if("focus" in client) return client.focus();
        }
      }catch{}
    }
    if(clients.openWindow) return clients.openWindow(target);
  })());
});
