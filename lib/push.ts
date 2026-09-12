export function urlBase64ToUint8Array(base64String:string) {
  const padding="=".repeat((4-(base64String.length%4))%4);
  const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=window.atob(base64);
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

export async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push not supported");
  }
  const permission=await Notification.requestPermission();
  if(permission!=="granted") throw new Error("Permission denied");

  const reg=await navigator.serviceWorker.register("/sw.js");
  const subscription=await reg.pushManager.subscribe({
    userVisibleOnly:true,
    applicationServerKey:urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
  });

  const res=await fetch("/api/push/subscribe",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify(subscription)
  });
  if(!res.ok) throw new Error("Subscribe failed");
  return subscription;
}
