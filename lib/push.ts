export type PushStage =
  | "support"
  | "permission"
  | "vapid"
  | "service-worker"
  | "browser-subscription"
  | "server-save";

export class PushSetupError extends Error {
  stage: PushStage;
  detail?: string;
  constructor(stage:PushStage,message:string,detail?:string){
    super(message);
    this.name="PushSetupError";
    this.stage=stage;
    this.detail=detail;
  }
}

export function urlBase64ToUint8Array(base64String:string) {
  const padding="=".repeat((4-(base64String.length%4))%4);
  const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=window.atob(base64);
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

export async function subscribeToPush() {
  if (!("serviceWorker" in navigator)) {
    throw new PushSetupError("support","Ta przeglądarka nie obsługuje Service Worker.");
  }
  if (!("PushManager" in window)) {
    throw new PushSetupError("support","Ta przeglądarka nie obsługuje Web Push.");
  }
  if (!("Notification" in window)) {
    throw new PushSetupError("support","Ta przeglądarka nie udostępnia powiadomień.");
  }

  const permission=await Notification.requestPermission();
  if(permission!=="granted"){
    throw new PushSetupError(
      "permission",
      permission==="denied"
        ? "Powiadomienia są zablokowane dla tej witryny."
        : "Nie przyznano zgody na powiadomienia."
    );
  }

  const vapid=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if(!vapid){
    throw new PushSetupError("vapid","Brak publicznego klucza VAPID w aplikacji.");
  }

  let reg:ServiceWorkerRegistration;
  try{
    reg=await navigator.serviceWorker.register("/sw.js",{scope:"/"});
    await navigator.serviceWorker.ready;
  }catch(e:any){
    throw new PushSetupError(
      "service-worker",
      "Nie udało się uruchomić modułu powiadomień (Service Worker).",
      String(e?.message||e)
    );
  }

  let subscription=await reg.pushManager.getSubscription();

  if(!subscription){
    try{
      subscription=await reg.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:urlBase64ToUint8Array(vapid)
      });
    }catch(e:any){
      throw new PushSetupError(
        "browser-subscription",
        "Telefon nie utworzył subskrypcji push.",
        String(e?.message||e)
      );
    }
  }

  const json=subscription.toJSON();
  if(!json.endpoint || !json.keys?.p256dh || !json.keys?.auth){
    throw new PushSetupError(
      "browser-subscription",
      "Przeglądarka utworzyła niepełną subskrypcję push."
    );
  }

  let res:Response;
  try{
    res=await fetch("/api/push/subscribe",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(json)
    });
  }catch(e:any){
    throw new PushSetupError(
      "server-save",
      "Nie udało się połączyć z serwerem podczas zapisu telefonu.",
      String(e?.message||e)
    );
  }

  let data:any={};
  try{ data=await res.json(); }catch{}

  if(!res.ok){
    throw new PushSetupError(
      "server-save",
      data?.message || data?.error || `Serwer odrzucił zapis telefonu (${res.status}).`,
      data?.detail || data?.code
    );
  }

  return {subscription,server:data};
}
