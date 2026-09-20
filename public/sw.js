// Service Worker — Quiz Biblique C.E.V
// Version 2.0 — Ajout du cache offline pour le quiz (hors connexion),
// tout en gardant les mises à jour de contenu rapides et le
// multijoueur/comptes (Supabase) toujours en direct sur le réseau.

var CACHE_NAME = "cev-shell-v2";
var CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png"
];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE_ASSETS).catch(function(){
        // Si un des assets manque, on n'empêche pas l'installation
      });
    })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(function(keys){
        return Promise.all(
          keys.filter(function(k){ return k !== CACHE_NAME; })
              .map(function(k){ return caches.delete(k); })
        );
      })
    ])
  );
});

// Stratégie de fetch :
// - Requêtes vers Supabase (comptes, scores, multijoueur) : jamais mises en cache,
//   toujours en direct sur le réseau. Si offline, elles échouent normalement
//   (c'est un usage qui nécessite vraiment une connexion).
// - Reste de l'app (HTML, manifest, icônes) : network-first avec repli sur le
//   cache si hors ligne, pour que le quiz solo/chapitre/examen de livre
//   fonctionnent sans connexion tout en recevant les mises à jour dès qu'elles
//   sont disponibles en ligne.
self.addEventListener('fetch', function(e){
  var url = new URL(e.request.url);

  // Ne jamais intercepter les appels Supabase (API, auth, functions)
  if(url.hostname.indexOf('supabase.co') !== -1){
    return;
  }

  // Ne gérer que les requêtes GET same-origin
  if(e.request.method !== 'GET' || url.origin !== self.location.origin){
    return;
  }

  e.respondWith(
    fetch(e.request).then(function(networkResponse){
      // Mise à jour du cache avec la dernière version reçue du réseau
      var copy = networkResponse.clone();
      caches.open(CACHE_NAME).then(function(cache){
        cache.put(e.request, copy);
      });
      return networkResponse;
    }).catch(function(){
      // Hors ligne : on sert la dernière version connue en cache
      return caches.match(e.request).then(function(cached){
        return cached || caches.match('/index.html');
      });
    })
  );
});

// Recevoir les notifications push — gère 3 types distincts, sans jamais
// mélanger leur contenu : challenge, verset du jour, motivation.
// OneSignal imbrique les données personnalisées (passées via "data" côté
// serveur) sous raw.custom.a — c'est là qu'on lit le vrai "type" et le
// reste des infos, pas à la racine du JSON.
self.addEventListener('push', function(e){
  if(!e.data)return;
  var raw={};
  try{raw=e.data.json();}catch(err){raw={};}

  var custom=(raw.custom&&raw.custom.a)||{};
  var notifType=custom.type||"generic";
  var payloadTitle=raw.title||"Quiz Biblique C.E.V";
  var payloadBody=raw.alert||raw.body||"";
  var icon="/icons/icon-192x192.png";

  var options={
    body:payloadBody,
    icon:icon,
    badge:icon,
    vibrate:[200,100,200],
    data:{type:notifType,code:custom.code||"",url:custom.url||raw.url||"/"}
  };

  if(notifType==="challenge"){
    options.tag="cev-challenge";
    options.renotify=true;
    options.actions=[
      {action:"join",title:"Rejoindre ⚔️"},
      {action:"dismiss",title:"Plus tard"}
    ];
  } else if(notifType==="daily_verse"){
    options.tag="cev-daily-verse";
  } else if(notifType==="motivation"){
    options.tag="cev-motivation";
  } else {
    options.tag="cev-generic";
  }

  e.waitUntil(
    self.registration.showNotification(payloadTitle,options)
  );
});

// Clic sur la notification — le comportement dépend du type, pas d'un
// chemin unique codé en dur pour tout le monde.
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  if(e.action==="dismiss")return;
  var d=e.notification.data||{};
  var url=d.url||"/";
  // Peu importe qu'on clique sur le corps de la notification ou sur le bouton
  // "Rejoindre" — un clic sur une notification de challenge doit toujours amener
  // au remplissage automatique du code de la salle.
  if(d.type==="challenge"&&d.code){
    url="/?join="+d.code;
  }
  e.waitUntil(
    self.clients.matchAll({type:"window",includeUncontrolled:true}).then(function(clients){
      for(var i=0;i<clients.length;i++){
        if(clients[i].url.indexOf(self.location.origin)===0){
          clients[i].focus();
          if(d.type==="challenge"&&d.code){
            clients[i].postMessage({type:"join_challenge",code:d.code});
          } else if(clients[i].navigate){
            clients[i].navigate(url);
          }
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
