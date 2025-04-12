// Inizializza Supabase client
const supabaseUrl = 'https://jlwhzoesyqsyzdkdpebc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsd2h6b2VzeXFzeXpka2RwZWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0OTU0MTQsImV4cCI6MjA2MDA3MTQxNH0.ifvHUkBGLTjJlOvYE0dfMJDbGVFUC0MtvdUfNAPwKwc';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Variabili globali
let map;
let vectorSource;
let popupOverlay;
let jobsData = [];

// Funzione per estrarre coordinate da un link Google Maps
function extractCoordinatesFromLink(link) {
    // Cerca modelli comuni nei link Google Maps
    // Pattern 1: @37.7749,-122.4194,14z (formato: @latitude,longitude,zoom)
    let pattern1 = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    // Pattern 2: ?q=37.7749,-122.4194 (formato: ?q=latitude,longitude)
    let pattern2 = /\?q=(-?\d+\.\d+),(-?\d+\.\d+)/;
    
    let match = link.match(pattern1) || link.match(pattern2);
    
    if (match) {
        return {
            latitude: parseFloat(match[1]),
            longitude: parseFloat(match[2])
        };
    }
    
    return null;
}

// Inizializza la mappa
function initMap() {
    // Crea l'origine vettoriale per i marker
    vectorSource = new ol.source.Vector();
    
    // Crea il layer vettoriale
    const vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        style: new ol.style.Style({
            image: new ol.style.Icon({
                anchor: [0.5, 1],
                src: 'https://openlayers.org/en/latest/examples/data/icon.png'
            })
        })
    });
    
    // Inizializza la mappa
    map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            }),
            vectorLayer
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([11.3272, 44.4937]), // Coordinate di Bologna, Italia
            zoom: 5
        })
    });
    
    // Crea il popup overlay
    const popupElement = document.createElement('div');
    popupElement.className = 'popup';
    
    popupOverlay = new ol.Overlay({
        element: popupElement,
        positioning: 'bottom-center',
        stopEvent: false,
        offset: [0, -10]
    });
    
    map.addOverlay(popupOverlay);
    
    // Aggiungi la gestione dei click sulla mappa per mostrare i popup
    map.on('click', function(evt) {
        const feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
            return feature;
        });
        
        if (feature) {
            const coordinates = feature.getGeometry().getCoordinates();
            popupOverlay.setPosition(coordinates);
            
            const job = feature.get('job');
            const date = new Date(job.created_at);
            
            popupElement.innerHTML = `
                <h3>${job.title}</h3>
                <div class="company">${job.company}</div>
                <div class="description">${job.description}</div>
                <div class="date">Posted: ${date.toLocaleDateString()}</div>
            `;
        } else {
            popupOverlay.setPosition(undefined);
        }
    });
    
    // Carica i lavori esistenti
    loadJobs();
}

// Carica i lavori dal database e aggiungili alla mappa
async function loadJobs() {
    try {
        const { data: jobs, error } = await supabase
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error("Error loading jobs:", error);
            // Fallback a dati di esempio se c'è un errore
            useSampleData();
            return;
        }
        
        if (!jobs || jobs.length === 0) {
            console.log("No jobs found, using sample data for demonstration");
            useSampleData();
            return;
        }
        
        jobsData = jobs;
        
        // Pulisci i marker esistenti
        vectorSource.clear();
        
        // Aggiungi i marker per ogni lavoro
        jobs.forEach(job => {
            if (job.latitude && job.longitude) {
                const feature = new ol.Feature({
                    geometry: new ol.geom.Point(
                        ol.proj.fromLonLat([job.longitude, job.latitude])
                    )
                });
                
                // Salva i dati del lavoro come proprietà della feature
                feature.set('job', job);
                
                vectorSource.addFeature(feature);
            }
        });
        
        // Aggiorna la lista dei lavori
        updateJobList(jobs);
    } catch (error) {
        console.error("Failed to load jobs:", error);
        useSampleData();
    }
}

// Usa dati di esempio se Supabase fallisce o è vuoto
function useSampleData() {
    const sampleJobs = [
        {
            id: 1,
            title: "Software Developer",
            company: "Tech Solutions Inc.",
            description: "Sviluppatore full-stack per progetti web innovativi.",
            latitude: 45.4642,
            longitude: 9.1900,  // Milano
            created_at: "2023-04-10T10:30:00Z"
        },
        {
            id: 2,
            title: "UX Designer",
            company: "Creative Studio",
            description: "Designer per interfacce mobile e web con esperienza in Figma.",
            latitude: 41.9028,
            longitude: 12.4964,  // Roma
            created_at: "2023-04-12T14:15:00Z"
        },
        {
            id: 3,
            title: "Data Analyst",
            company: "Data Insights",
            description: "Analista dati con competenze in SQL e visualizzazione.",
            latitude: 40.8518,
            longitude: 14.2681,  // Napoli
            created_at: "2023-04-14T09:45:00Z"
        }
    ];
    
    jobsData = sampleJobs;
    
    // Pulisci i marker esistenti
    vectorSource.clear();
    
    // Aggiungi i marker per ogni lavoro
    sampleJobs.forEach(job => {
        if (job.latitude && job.longitude) {
            const feature = new ol.Feature({
                geometry: new ol.geom.Point(
                    ol.proj.fromLonLat([job.longitude, job.latitude])
                )
            });
            
            // Salva i dati del lavoro come proprietà della feature
            feature.set('job', job);
            
            vectorSource.addFeature(feature);
        }
    });
    
    // Aggiorna la lista dei lavori
    updateJobList(sampleJobs);
}

// Aggiorna la lista dei lavori
function updateJobList(jobs) {
    const jobList = document.getElementById('jobList');
    
    if (!jobs || jobs.length === 0) {
        jobList.innerHTML = `<h3>Recent Job Postings</h3><p>No jobs posted yet.</p>`;
        return;
    }
    
    let jobListHTML = `<h3>Recent Job Postings</h3>`;
    jobs.slice(0, 10).forEach(job => {
        const date = new Date(job.created_at);
        jobListHTML += `
            <div class="job-item" data-id="${job.id}">
                <h4>${job.title}</h4>
                <div class="company">${job.company}</div>
                <div class="date">Posted: ${date.toLocaleDateString()}</div>
            </div>
        `;
    });
    
    jobList.innerHTML = jobListHTML;
    
    // Aggiungi event listener per i job nella lista
    document.querySelectorAll('.job-item').forEach(item => {
        item.addEventListener('click', function() {
            const jobId = this.getAttribute('data-id');
            const job = jobsData.find(j => j.id == jobId);
            
            if (job && job.latitude && job.longitude) {
                // Centra la mappa su questo job
                map.getView().animate({
                    center: ol.proj.fromLonLat([job.longitude, job.latitude]),
                    zoom: 10,
                    duration: 1000
                });
                
                // Simula un click sulla feature per mostrare il popup
                setTimeout(() => {
                    // Trova la feature corrispondente
                    const features = vectorSource.getFeatures();
                    const feature = features.find(f => f.get('job').id == jobId);
                    
                    if (feature) {
                        const coordinates = feature.getGeometry().getCoordinates();
                        popupOverlay.setPosition(coordinates);
                        
                        const job = feature.get('job');
                        const date = new Date(job.created_at);
                        
                        const popupElement = popupOverlay.getElement();
                        popupElement.innerHTML = `
                            <h3>${job.title}</h3>
                            <div class="company">${job.company}</div>
                            <div class="description">${job.description}</div>
                            <div class="date">Posted: ${date.toLocaleDateString()}</div>
                        `;
                    }
                }, 1100);
            }
        });
    });
}

// Funzione per inviare un nuovo lavoro
async function submitJob(formData) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.style.display = 'block';
    
    try {
        const { data, error } = await supabase
            .from('jobs')
            .insert([formData])
            .select();
        
        loadingIndicator.style.display = 'none';
        
        if (error) {
            console.error("Error submitting job:", error);
            alert("Si è verificato un errore durante il salvataggio dell'annuncio. Riprova più tardi.");
            return false;
        }
        
        // Mostra il messaggio di successo
        const successOverlay = document.getElementById('successOverlay');
        successOverlay.style.display = 'flex';
        setTimeout(() => {
            successOverlay.style.display = 'none';
        }, 3000);
        
        // Ricarica i lavori
        loadJobs();
        
        return true;
    } catch (error) {
        loadingIndicator.style.display = 'none';
        console.error("Failed to submit job:", error);
        alert("Si è verificato un errore durante il salvataggio dell'annuncio. Riprova più tardi.");
        return false;
    }
}

// Inizializza quando la pagina si carica
document.addEventListener('DOMContentLoaded', function() {
    // Inizializza la mappa
    initMap();
    
    // Gestisci l'invio del form
    const jobForm = document.getElementById('jobForm');
    const linkError = document.getElementById('linkError');
    
    jobForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const jobTitle = document.getElementById('jobTitle').value;
        const company = document.getElementById('company').value;
        const description = document.getElementById('description').value;
        const googleMapsLink = document.getElementById('googleMapsLink').value;
        
        // Estrai le coordinate dal link Google Maps
        const coordinates = extractCoordinatesFromLink(googleMapsLink);
        
        if (!coordinates) {
            linkError.style.display = 'block';
            return;
        }
        
        linkError.style.display = 'none';
        
        // Prepara i dati del form
        const formData = {
            title: jobTitle,
            company: company,
            description: description,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            created_at: new Date().toISOString()
        };
        
        // Invia il lavoro
        const success = await submitJob(formData);
        
        if (success) {
            // Pulisci il form
            jobForm.reset();
            
            // Centra la mappa sulla nuova posizione del lavoro
            map.getView().animate({
                center: ol.proj.fromLonLat([coordinates.longitude, coordinates.latitude]),
                zoom: 10,
                duration: 1000
            });
        }
    });
});
