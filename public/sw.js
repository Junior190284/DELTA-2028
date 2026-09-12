self.addEventListener("push",event=>{
  let data={title:"DELTA 2018 GM",body:"Nowe powiadomienie drużyny",url:"/"};
  try{data=event.data.json()}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{
    body:data.body,
    data:{url:data.url||"/"}
  }));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url||"/"));
});
