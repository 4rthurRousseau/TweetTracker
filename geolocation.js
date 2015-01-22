// Définition des variables globales
var id = null;
var interval = 0;
var oldKeyword = null;
var retrieve = false;
var tweets = [];


// Définition des champs utilisés à plusieurs endroits
var content = document.getElementById("content");
var element = document.getElementById("popup");
var langage = document.getElementById("langage");
var element = document.getElementById('popup');
var search = document.getElementById("search");
var bind = document.getElementById("checkbox-1");
var params = document.getElementById("params");
var parameters = document.getElementById("parameters");
var header = document.getElementById("header");

// Création de la source
var vectorSource = new ol.source.Vector({
});

// Création du calque
var vectorLayer = new ol.layer.Vector({
	source: vectorSource
});

// Création de la source
var linesSource = new ol.source.Vector({
});

// Création du calque
var linesLayer = new ol.layer.Vector({
    source: linesSource
});

linesLayer.setVisible(false);

// Création de la carte
var map = new ol.Map({
	target: 'map',
	layers: [
	new ol.layer.Tile({
		source: new ol.source.BingMaps({
			key: 'Ak-dzM4wZjSqTlzveKz5u0d4IQ4bRzVI309GxmkgSVr1ewS6iPSrOvOKhA-CJlm3', 
			imagerySet: 'AerialWithLabels',
			maxZoom: 19})
	}), vectorLayer, linesLayer],
	view: new ol.View({
		center: ol.proj.transform([3.352, 46.854
			], 'EPSG:4326', 'EPSG:3857'),
		zoom: 2,
	})
});


var popup = new ol.Overlay({
	element: element,
	positioning: 'bottom-center',
	stopEvent: false
});
map.addOverlay(popup);

// Lorsqu'on clique sur la carte
map.on("click", function(e) {
	// S'il y a des marqueurs à cet endroit
	var feature = map.forEachFeatureAtPixel(e.pixel, 
		function (feature, layer) {
			return feature;
		});

	if (feature){
		showPopup(feature);
	} else {
		element.style.display = "none";
	}
});

function showPopup(feature){
	// On récupère l'id du marqueur à afficher
	var id = feature.getId();

	// On affiche le tweet correspondant
	document.getElementById(id).scrollIntoView();

	// Récupération des coordonnées du tweet
	var geometry = feature.getGeometry();
	var coordinates = geometry.getCoordinates();
	popup.setPosition(coordinates);
	element.innerHTML = document.getElementById(id).childNodes[1].innerHTML;
	element.style.display = "block";
}

search.addEventListener("click", function(event){
	if (ol != null){
		var keyword = document.getElementById("request").value;
		
		// On change l'état de la récupération
		retrieve = !retrieve;

		// Si on cherche à afficher des tweets
		if (retrieve){
			if (keyword != ""){
				// On change le texte affiché
				search.value = "Chargement...";

				// Si on a changé de mot clé depuis la dernière recherche
				if (oldKeyword == null || oldKeyword != keyword){
					// On supprime les tweets récupérés
					resetControls();

					// On change le mot clé
					oldKeyword = keyword;
				}

				// Récupération des résultats
				getResults(keyword);

				// Définition de l'interval
				interval = setInterval(function(){
					getResults(keyword);
				}, 7000);
			} else {
				alert("Veuillez renseigner un mot-clé / hashtag.");
				retrieve = false;
			}
		} else {
			// On change le texte affiché
			search.value = "Afficher";

			// On supprime l'interval
			clearInterval(interval);
		}
	} else {
		alert("Impossible de charger la librairie OpenLayers 3");
	}
}, false);	

// Récupération des résultats correspondants au(x) mot(s)-clé(s)
function getResults(keyword){
	
	var REQUEST_URL = "https://api.twitter.com/1.1/search/tweets.json?";

	var request = new XMLHttpRequest();
	var requestParameters = "q=" + encodeURIComponent(keyword) + "&count=100";
	requestParameters += (id != null ? "&since_id=" + id : "");
	requestParameters += (langage.options[langage.selectedIndex].value != "" ? "&lang=" + langage.options[langage.selectedIndex].value : "");
	request.open('GET', "geotweet.php?twitter_query=" + escape(REQUEST_URL + requestParameters), true);
	request.send();

	request.onreadystatechange=function() {
		if (request.readyState == 4 && request.status == 200){
			// Si on a récupéré des tweets
			var response = JSON.parse(request.responseText);
			if (response.statuses != null){
				response.statuses.forEach(function(element, index, array){
					appendTweet(element);
				});
			} else {
				alert(request.responseText);
			}
		}
	};
} 

function appendTweet(element){
	if (tweets.indexOf(element.id)){
		// REV Geo 1.0 - Prise en compte de la localisation
		var geolocated = false;

		// Si les coordonnées géographiques sont renseignées
		if (element.coordinates != null){
			// Si les coordonnées géographiques sont "correctes"
			if (element.coordinates.coordinates[0] != 0 || element.coordinates.coordinates[1] != 0){
				geolocated = true;
			}
		}
		
		if (geolocated){		
			// Création d'une nouvelle div contenant toutes les informations du tweet
			var div = document.createElement('div');
			div.id = element.id;
			div.className = "tweet";

			// Création d'un nouveau span contenant le nom de l'auteur du tweet
			var span = document.createElement('span');
			span.className = "author";
			span.innerHTML = element.user.name + " ";

			var a = document.createElement('a');
			a.setAttribute("href", "http://www.twitter.com/" + element.user.screen_name);
			a.innerHTML = "(@" + element.user.screen_name + ")";

			// Création d'un nouveau paragraphe contenant le contenu du tweet
			var p = document.createElement('p');
			p.innerHTML = element.text;

			span.appendChild(a);
			div.appendChild(span);
			div.appendChild(p);
			content.insertBefore(div, content.firstChild);

			// Ajout du marqueur sur la carte
			addMarker(element);
		}
		// Changement de l'ID actuel
		if (element.id > id){
			id = element.id;
		}

		// Ajout du tweet au tableau
		tweets.push(element.id);
	}
}

// Fonction permettant de créer un nouveau point
function addMarker(tweet){
	var latitude = tweet.coordinates.coordinates[0],
	longitude = tweet.coordinates.coordinates[1];

	// On vérifie que le tweet n'arrive pas en [0,0]
	if (latitude != 0 || longitude != 0){
		var icon = new ol.Feature({
			geometry: new ol.geom.Point(ol.proj.transform([latitude,longitude], 'EPSG:4326',   'EPSG:3857'))
		});

		// REV Importance 1.0 - Mise en évidence des tweets aparaissant comme importants
		if (tweet.retweet_count >= 150 || tweet.favorite_count >= 150){
			// TODO : augmenter la taille du tweet aparaissant sur la carte
		}


		// On affecte un ID au marqueur
		icon.setId(tweet.id);

		// Mise à jour de la carte
		vectorSource.addFeature(icon);

		// REV Liaison 1.0 - Recherche des tweets à lier
		if (tweet.retweeted_status != null){
			var rt = tweet.retweeted_status;

			if (rt.coordinates != null){
				// Si le retweet n'est pas déjà dans la liste des tweets
				if (document.getElementById(rt.id) == null){
					appendTweet(rt);
				}

				// Création d'un lien entre le tweet et son retweet
				lier(tweet, rt);
			}
		}
	} else {
		// Aïe aïe aïe... le tweet est tombé à l'eau...
		// A L'ABORDAAAAAAGE!
	}
}


// Création d'un event listener dans le cas où on voudrait lier les retweets (défaut : non)
bind.addEventListener("CheckboxStateChange", function(){
	linesLayer.setVisible(this.checked);
}, false);


// Fonction permettant de remettre à zéro la carte / les contrôles.
// C'est le cas par exemple lors d'un changement de mot clé.
function resetControls(){
	this.id = 0;
	this.tweets = [];
	vectorSource.clear();
	linesSource.clear();
	while (content.firstChild){
		content.removeChild(content.firstChild);
	}
}

//
content.addEventListener("click", function(event){
	var div = !event.target.className.contains("tweet") ? event.target.parentNode : event.target;
	if (div != null){
		var feature = vectorSource.getFeatureById(div.id);
		if (feature != null){
			map.getView().setCenter(feature.getGeometry().getCoordinates());
			showPopup(feature);
		}
	}
}, false);	

function lier(tweet, retweet){
	var line = [];

	line[0] = ol.proj.transform([tweet.coordinates.coordinates[0],tweet.coordinates.coordinates[1]], 'EPSG:4326',   'EPSG:3857');
	line[1] = ol.proj.transform([retweet.coordinates.coordinates[0],retweet.coordinates.coordinates[1]], 'EPSG:4326',   'EPSG:3857');

	var feature = new ol.Feature({
            geometry: new ol.geom.LineString(line, 'XY'),
            name: 'Line'
        });

	// Mise à jour de la carte
	linesSource.addFeature(feature);
}

// Création d'un event listener dans le cas où on ne voudrait afficher que les tweets géolocalisés (défaut : oui)
params.addEventListener("CheckboxStateChange", function(){
	var state = this.checked ? "expanded" : "";
	if (header != null){
		header.className = state;
	}
}, false);
