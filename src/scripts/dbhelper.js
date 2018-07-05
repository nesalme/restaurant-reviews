import idb from 'idb';

/**
 * Common database helper functions.
 */
export class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const PORT = 1337; // Change this to your server port
    return `http://localhost:${PORT}/restaurants`;
  }

  /**
   * Open IndexedDB.
   */
  static openIndexedDB() {
    // For browsers with no IndexedDB support
    if (!('indexedDB' in window)) {
      console.log('This browser does not support IndexedDB.');
      return;
    }

    const DB_NAME = 'restaurant-reviews';
    const DB_VERSION = 1;

    return idb.open(DB_NAME, DB_VERSION, upgradeDB => {
      console.log('Creating a new object store');

      // Create object store for restaurant data (only if none exists yet)
      if (!upgradeDB.objectStoreNames.contains('restaurants')) {
        upgradeDB.createObjectStore('restaurants', {keyPath: 'id'});
        console.log('Created new object store restaurants');
      }
    });
  }

  /**
   * Update IndexedDB cache.
   */
  static updateIndexedDB(data) {
    DBHelper.openIndexedDB()
      .then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        const store = tx.objectStore('restaurants');

        // Break down imported data (sorted in data array) and store
        // each piece of data in IndexedDB restaurants store
        data.forEach(item => store.put(item));

        return tx.complete;
      })
      .then(() => console.log('IndexedDB database successfully updated.'))
      .catch(error => console.log('Failed to update IndexedDB store:', error));
  }

  /**
   * Fetch data from IndexedDB database.
   */
  static fetchFromIndexedDB() {
    return DBHelper.openIndexedDB()
      .then(db => {
        const tx = db.transaction('restaurants');
        const store = tx.objectStore('restaurants');

        // Return all items in object store.
        return store.getAll();
      });
  }

  /**
   * Fetch data from API.
   */
  static fetchFromAPI() {
    // Fetch JSON data from API and parse.
    return fetch(DBHelper.DATABASE_URL, {
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    }).then(response => response.json())
      .then(data => {
        // Update IndexedDB database with fresh data fetched from API and return.
        DBHelper.updateIndexedDB(data);
        return data;
      })
      .catch(error => console.log('Request failed:', error));
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    // Fetch restaurants data from IndexedDB database.
    DBHelper.fetchFromIndexedDB()
      .then(data => {
        // If IndexedDB returns no/empty data, fetch from API.
        if (!data || data.length < 1) {
          console.log('Retrieving data from API.');
          return DBHelper.fetchFromAPI();
        }

        console.log('Retrieving data from IndexedDB database.');

        // Return data to pass into callback function.
        return data;
      })
      .then (data => {
        callback(null, data);
      })
      .catch(error => {
        console.log('Unable to fetch restaurant data:', error);
        callback(error, null);
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const RESTAURANT = restaurants.find(r => r.id == id);
        if (RESTAURANT) { // Got the restaurant
          callback(null, RESTAURANT);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const RESULTS = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, RESULTS);
      }
    });
  }

  /**
   * Fetch restaurants by neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const RESULTS = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, RESULTS);
      }
    });
  }

  /**
   * Fetch restaurants by cuisine and neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const NEIGHBORHOODS = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const UNIQUE_NEIGHBORHOODS = NEIGHBORHOODS.filter((v, i) => NEIGHBORHOODS.indexOf(v) == i);
        callback(null, UNIQUE_NEIGHBORHOODS);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const CUISINES = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const UNIQUE_CUISINES = CUISINES.filter((v, i) => CUISINES.indexOf(v) == i);
        callback(null, UNIQUE_CUISINES);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    // Use restaurant data to retrieve correct photograph from images folder
    if (restaurant && restaurant.photograph) {
      return `/images/${restaurant.photograph}`;
    }
    // Retrieve custom image if restaurant does not have photo.
    // Custom image uses an original photograph of Alex Jones, available on Unsplash at:
    // https://unsplash.com/photos/v0_6jaOOjpk
    // TODO: Give credit to photographer and Unsplash in UI (eg, Photo by Alex Jones on Unsplash)
    return `/images/unavailable`;
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const MARKER = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return MARKER;
  }

/**
 * Remove map (and all descendants) from tab order
 */
  static removeMapsTabOrder() {
    document.querySelectorAll('#map *').forEach((el) => {
      el.setAttribute('tabindex', '-1');
    });
  }

/**
 * Set title on iframe to fulfill accessibility requirements
 */
  static setTitleOnIframe() {
    document.querySelectorAll('#map iframe').forEach((el) => {
      el.setAttribute('title', 'Restaurant locations on Google Maps');
    });
  }
}