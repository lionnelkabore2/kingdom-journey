// Service Worker — Quiz Biblique C.E.V
// Version 1.0

self.addEventListener('install', function(e){
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(self.clients.claim());
});

// Recevoir les notifications push
self.addEventListener('push', function(e){
  if(!e.data)return;
  var data={};
  try{data=e.data.json();}catch(err){data={title:"Quiz Biblique C.E.V",body:e.data.text()};}

  var title=data.title||"⚔️ Challenge Biblique !";
  var options={
    body:data.body||"Un challenge vient d'être créé !",
    icon:"/icon-192.png",
    badge:"/icon-96.png",
    vibrate:[200,100,200],
    tag:"cev-challenge",
    renotify:true,
    data:{code:data.code||"",url:"/"},
    actions:[
      {action:"join",title:"Rejoindre ⚔️"},
      {action:"dismiss",title:"Plus tard"}
    ]
  };

  e.waitUntil(
    self.registration.showNotification(title,options)
  );
});

// Clic sur la notification
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  if(e.action==="dismiss")return;

  var code=e.notification.data.code||"";
  var url="/?join="+code;

  e.waitUntil(
    self.clients.matchAll({type:"window",includeUncontrolled:true}).then(function(clients){
      for(var i=0;i<clients.length;i++){
        if(clients[i].url.indexOf(self.location.origin)===0){
          clients[i].focus();
          clients[i].postMessage({type:"join_challenge",code:code});
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
