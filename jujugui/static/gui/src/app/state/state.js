/*
This file is part of the Juju GUI, which lets users view and manage Juju
environments within a graphical interface (https://launchpad.net/juju-gui).
Copyright (C) 2016 Canonical Ltd.

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License version 3, as published by
the Free Software Foundation.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranties of MERCHANTABILITY,
SATISFACTORY QUALITY, or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero
General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

if (typeof this.jujugui === 'undefined') {
  this.jujugui = {};
}

const ROOT_RESERVED = [
  'about', 'bigdata', 'docs', 'juju', 'login', 'logout', 'new', 'store'];
const PROFILE_RESERVED = ['charms', 'issues', 'revenue', 'settings'];
const PATH_DELIMETERS = new Map([['search', 'q'], ['user', 'u'], ['gui', 'i']]);
const GUI_PATH_DELIMETERS = [
  'account', 'applications', 'deploy', 'inspector', 'isv', 'machines'];

/** Class representing the State of the Juju GUI */
const State = class State {
  /**
    Create a new instance of the GUI state.
    @param {Object} cfg - The configuration options for a new State instance.
  */
  constructor(cfg) {
    /**
      The baseURL to use when generating URLs. This value is required and
      should be the full base path that the GUI is served from.
      @property baseURL
      @type {String}
    */
    if (!cfg.baseURL) {
      throw new Error('baseURL must be provided.');
    }
    this.baseURL = cfg.baseURL;
    /**
      The list of dispatchers for the various components from the URL.
      @type {Object}
    */
    this.dispatchers = cfg.dispatchers;

    if (!cfg.seriesList || !Array.isArray(cfg.seriesList)) {
      throw new Error('Series list must be an Array.');
    }
    // Push bundle into the seriesList as it sits in the series spot in the URL.
    cfg.seriesList.push('bundle');
    /**
      The list of possible distro 'series' for the store paths. ex)
      trusty, precise, xenial. The GUI has a utils method `getSeriesList` that
      is the central storage location for the series information. This Object
      should be converted to an array and passed to this state when being
      instantiated.
      @type {Array}
    */
    this.seriesList = cfg.seriesList;
    /**
      Internal storage value for the application location. Only used when
      location is set externally.
      @private
      @type {Object}
    */
    this._location = cfg.location || null;
    /**
      Internal storage for the app state history.
      @private
      @type {Array}
    */
    this._appStateHistory = [];
  }

  /**
    Takes a complete URL, strips off the supplied baseURL and extra slashes.
    @param {String} url - The URL to sanitize.
    @return {String} The sanitized path.
  */
  _getCleanPath(url) {
    return url
      // Strip the baseURL before parsing the sections.
      .replace(this.baseURL, '')
      // Strip the leading and trailing slashes off the URL.
      .replace(/^\/*/, '').replace(/\/*$/, '');
  }

  /**
    The current window location. If set has been called on this property then
    it will return the externally set option. Typically this option will be used
    for testing.
    @type {Object}
  */
  get location() {
    return this._location || window.location;
  }

  set location(location) {
    this._location = location;
  }

  /**
    The object representing the current app state.
    @type {Object}
  */
  get appState() {
    return this._appStateHistory[this._appStateHistory.length-1];
  }

  /**
    Checks the current location and parses it, building the state, then
    executing the registered dispatchers.
  */
  dispatch() {
    let error, state;
    ({error, state} = this.generateState(this.location.href));
    this._appStateHistory.push(state);
    if (error !== null) {
      return `unable to generate state: ${error}`;
    }
    this._dispatch(state);
  }

  /**
    Takes the existing app state and then calls the registered dispatchers.
  */
  _dispatch() {}

  /**
    Changes the internal state of the app, updating the location and
    dispatching the app.
    @param {Object} state - The new state delta to apply to the existing state.
  */
  changeState(state) {}

  /**
    Splits the URL up and generates a state object.
    @param {String} url - The URL to turn into state.
    @return {Object} The generated state object. In the format:
      {
        error: <String>,
        state: <Object
      }
  */
  generateState(url) {
    let error = null;
    let state = {};
    let parts = this._getCleanPath(url).split('/');
    state = this._parseRoot(parts, state);
    // If we have root paths in the URL then we can ignore everything else.
    if (state.root) {
      // If there is anything after this then it's an invalid URL.
      if (parts.length > 1) {
        error = 'invalid root path.';
      }
      return {error, state};
    }
    // The order of the PATH_DELIMETERS is important so we can assume the
    // order for easy parsing of the path.
    if (parts[0] === PATH_DELIMETERS.get('search')) {
      state = this._parseSearch(parts.splice(1), state);
      // If we have a search path in the URL then we can ignore everything else.
      return {error, state};
    }
    // Working backwards to split up the URL.
    const guiIndex = parts.indexOf(PATH_DELIMETERS.get('gui'));
    if (guiIndex > -1) {
      ({state, error} = this._parseGUI(parts.splice(guiIndex), state));
      if (error !== null) {
        error = `cannot parse the GUI path: ${error}`;
        return {error, state};
      }
    }
    // Extract out the user sections.
    if (parts.includes(PATH_DELIMETERS.get('user'))) {
      ({state, parts, error} = this._parseUser(parts, state));
      if (error !== null) {
        error = `cannot parse the User path: ${error}`;
        return {error, state};
      }
    }
    // By this point there should only be the 'store only' content left.
    if (!state.store && parts.length) {
      // If there are more than 3 parts then this is an invalid url.
      if (parts.length > 3) {
        error = 'invalid store path.';
      } else {
        state.store = parts.join('/');
      }
      // If we have more content here but there is already a store populated.
      // then this is an invalid url.
    } else if (state.store && parts.length) {
      error = 'invalid store path.';
      state.store = parts.join('/');
    }
    return {error, state};
  }

  /**
    Takes the existing app state and generates the path.
    @return {String} The path representing the current application state.
  */
  generatePath() {
    let path = [];
    const root = this.appState.root;
    if (root) {
      path.push(root);
    }
    const search = this.appState.search;
    if (search) {
      path = path.concat([PATH_DELIMETERS.get('search'), search]);
    }
    const user = this.appState.user || this.appState.profile;
    if (user) {
      path = path.concat([PATH_DELIMETERS.get('user'), user]);
    }
    const store = this.appState.store;
    if (store) {
      path.push(store);
    }
    const gui = this.appState.gui;
    if (gui) {
      path.push(PATH_DELIMETERS.get('gui'));
      Object.keys(gui).forEach(key => {
        const value = gui[key];
        path.push(key);
        if (value !== '') {
          path.push(value);
        }
      });
    }
    return '/' + path.join('/');
  }

  /**
    Inspects the URL path to see if it is for the root.
    @param {Array} urlParts - The URL path split into parts.
    @param {Object} state - The application state object as being parsed
      from the URL.
    @return {Object} The updated state to contain the root value, if any.
  */
  _parseRoot(urlParts, state) {
    ROOT_RESERVED.some(key => {
      if (urlParts[0] === key) {
        state.root = key;
        return true;
      }
    });
    return state;
  }

  /**
    Parses the search portion of the URL without the
    PATH_DELIMETERS.get('search') key value.
    @param {Array} urlParts - The URL path split into parts.
    @param {Object} state - The application state object as being parsed
      from the URL.
    @return {Object} The updated state to contain the search value, if any.
  */
  _parseSearch(urlParts, state) {
    if (urlParts.length > 0) {
      state.search = urlParts.join('/');
    }
    return state;
  }

  /**
    Parses the GUI portion of the URL without the
    PATH_DELIMETERS.get('gui') key value.
    @param {Array} urlParts - The URL path split into parts.
    @param {Object} state - The application state object as being parsed
      from the URL.
    @return {Object} The updated state to contain the search value, if any.
  */
  _parseGUI(urlParts, state) {
    let error = null;
    let indexes = [];
    GUI_PATH_DELIMETERS.forEach(section => {
      const index = urlParts.indexOf(section);
      if (index > -1) {
        indexes.push(index);
      }
    });
    // If there were no sections found then this is an invalid URL.
    if (!indexes.length) {
      error = 'invalid GUI path.';
      return {error, state};
    }
    // JavaScript array sort sorts alphabetically which causes issues if
    // you have multiple default sections ie) [0, 9, 17] gets sorted as
    // [0, 17, 9]. So we must pass a custom sorter to it so that it sorts
    // numerically.
    indexes.sort((a, b) => a-b);
    // Split out and store the sections
    let guiParts = {};
    indexes.forEach((index, arIndex) => {
      const end = indexes[arIndex+1] || urlParts.length;
      guiParts[urlParts[index]] = urlParts.slice(index+1, end).join('/');
    });
    state.gui = guiParts;
    return {error, state};
  }

  /**
    Parses the URL and extracts the user delimeted sections.
    @param {Array} urlParts - The URL path split into parts.
    @param {Object} state - The application state object as being parsed
      from the URL.
    @return {Object} Contains the state, parts, error if any.
  */
  _parseUser(urlParts, state) {
    // Grab the indexes of the user delimeters as there can be multiple.
    let indexes = [];
    let error = null;
    urlParts.forEach((item, index) => {
      if (item === PATH_DELIMETERS.get('user')) {
        indexes.push(index);
      }
    });
    // If we have no user parts then we don't need to parse them.
    if (indexes.length === 0) {
      return { state, parts: urlParts, error };
    }
    // If we don't have a user delimeter at 0 then this is an invalid URL.
    if (indexes[0] !== 0) {
      return { state, parts: urlParts, error: 'invalid user path.'};
    }
    /**
      Takes the section of the URL parts which needs to be added to either the
      user or profile section and depending on its contents adds it to the
      appropriate section. This modifies the state object in place but also
      returns the state for completeness.
      @param {Array} block - The section of the URL parts which contains the
        data necessary to add to the state depending on its contents.
      @param {Object} state - The current instance of the state object.
      @returns {Object} The modified state object.
    */
    function addToUserOrProfile(block, state) {
      // If the second part of the path has one of the reserved words
      // from the profile then store it in the profile section
      if (block.length === 1 ||
          block[1] && PROFILE_RESERVED.includes(block[1])) {
        state.profile = block.join('/');
      } else {
        state.user = block.join('/');
      }
      return state;
    }

    switch (indexes.length) {
      case 1:
        // Extract out the user portion of the list and then remove the
        // user delimeter at the beginning.
        const userBlock = urlParts.splice(indexes[0]).slice(1);
        // If there are no sections after the delimeter is removed then this
        // is an invalid url.
        if (userBlock.length === 0) {
          return {state, parts: urlParts, error: 'invalid user path.'};
        }
        // The userBlock might have user components and store components.
        // The user component has at most two spots. If it has more, then
        // it may be a user store path.
        if (userBlock.length > 2) {
          // Check if this is a user store path.
          if (!Number.isNaN(parseInt(userBlock[2], 10)) ||
            this.seriesList.includes(userBlock[2])) {
            // Add the user prefix back in if it's a user store path.
            state.store = 'u/' + userBlock.splice(0).join('/');
          }
        }
        // If there are still parts then it wasn't a long user store URL
        // so only grab the user path.
        if (userBlock.length) {
          let block = userBlock.splice(0, 2);
          state = addToUserOrProfile(block, state);
        }
        // Anything left is a root store path which will be handled elsewhere
        // So add it back to the parts list.
        urlParts = urlParts.concat(userBlock);
        break;
      case 2:
        // JavaScript array sort sorts alphabetically which causes issues
        // if you have multiple default sections ie) [0, 9, 17] gets sorted
        // as [0, 17, 9]. So we must pass a custom sorter to it so that it
        // sorts numerically.
        indexes.sort((a, b) => a-b);
        // The first user portion will be the primary user.
        // Extract out the user portion of the list and then remove the
        // user delimeter at the beginning.
        let block = urlParts.splice(indexes[0], indexes[1]).slice(1);
        // If there are more than two parts in the first block when we have
        // two user blocks then the url is invalid.
        if (block.length > 2) {
          return {state, parts: urlParts, error: 'invalid user path.'};
        }
        state = addToUserOrProfile(block, state);
        // The second user portion will be the store section.
        const storeBlock = urlParts.splice(0).slice(1);
        // If there are less than two or more than four sections after
        // the delimeter is removed then this is an invalid url.
        if (storeBlock.length < 2 || storeBlock.length > 4) {
          return {state, parts: urlParts, error: 'invalid user store path.'};
        }
        // Add the user prefix back in if it's a user store path.
        state.store = 'u/' + storeBlock.join('/');
        break;
    }

    return {state, parts: urlParts, error};
  }
};

this.jujugui.State = State;