self.addEventListener("push",event=>{
  let data={title:"DELTA 2018 GM",body:"Nowe powiadomienie drużyny",url:"/dashboard",tag:"delta-teamhub"};
  try{data=event.data.json()}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{
    body:data.body,
    icon:"/assets/devils-crest.png",
    badge:"/assets/devils-crest.png",
    tag:data.tag||"delta-teamhub",
    renotify:true,
    data:{url:data.url||"/dashboard"}
  }));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||"/dashboard",self.location.origin).href;
  event.waitUntil((async()=>{
    const list=await clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of list){
      if("focus" in client){
        if("navigate" in client) await client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow(target);
  })());
});
