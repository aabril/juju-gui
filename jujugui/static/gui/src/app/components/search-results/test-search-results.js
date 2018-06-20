/* Copyright (C) 2017 Canonical Ltd. */
'use strict';

const React = require('react');
const enzyme = require('enzyme');

const GenericButton = require('../generic-button/generic-button');
const SearchResults = require('./search-results');
const SearchResultsItem = require('./item/item');
const SearchResultsSelectFilter = require('./select-filter/select-filter');
const SearchResultsTypeFilter = require('./type-filter/type-filter');

describe('SearchResults', function() {
  let acl, addToModel, charmstoreSearch, generatePath,
      models, results;

  const renderComponent = (options = {}) => enzyme.shallow(
    <SearchResults
      acl={options.acl || acl}
      addToModel={options.addToModel || sinon.stub()}
      changeState={options.changeState || sinon.stub()}
      charmstoreSearch={options.charmstoreSearch || charmstoreSearch}
      generatePath={options.generatePath || generatePath}
      query={options.query || 'spinach'}
      series={options.series}
      setPageTitle={options.setPageTitle || sinon.stub()}
      sort={options.sort}
      type={options.type} />
  );

  beforeEach(function() {
    // The makeEntityModel util uses the global models variable, so fake that here.
    models = window.models;
    window.models = {
      Bundle: sinon.stub().returnsArg(0),
      Charm: sinon.stub().returnsArg(0)
    };
    acl = {isReadOnly: sinon.stub().returns(false)};
    addToModel = sinon.stub();
    generatePath = sinon.stub();
    results = [{
      name: 'mysql-one',
      displayName: 'mysql-one',
      url: 'http://example.com/mysql-one',
      downloads: 1000,
      owner: 'test-owner',
      promulgated: true,
      id: 'mysql-one',
      storeId: '~test-owner/mysql-one',
      type: 'charm'
    }, {
      name: 'mysql-two',
      displayName: 'mysql-two',
      url: 'http://example.com/mysql-two',
      downloads: 1000,
      owner: 'test-owner',
      promulgated: true,
      id: 'mysql-two',
      storeId: '~test-owner/mysql-two',
      type: 'charm'
    }, {
      name: 'mysql-three',
      displayName: 'mysql-three',
      url: 'http://example.com/mysql-three',
      downloads: 1000,
      owner: 'test-owner',
      promulgated: false,
      id: 'mysql-three',
      storeId: '~test-owner/mysql-three',
      type: 'charm'
    }, {
      name: 'mysql-four',
      displayName: 'mysql-four',
      url: 'http://example.com/mysql-four',
      downloads: 1000,
      owner: 'test-owner',
      promulgated: false,
      id: 'mysql-four',
      storeId: '~test-owner/mysql-four',
      type: 'charm'
    }];
    const mockData = [{
      toEntity: sinon.stub().returns(results[0])
    }, {
      toEntity: sinon.stub().returns(results[1])
    }, {
      toEntity: sinon.stub().returns(results[2])
    }, {
      toEntity: sinon.stub().returns(results[3])
    }];
    charmstoreSearch = sinon.stub().callsArgWith(1, null, mockData);
  });

  afterEach(() => {
    window.models = models;
  });

  describe('functional tests', function() {
    it('can initially show the spinner', function() {
      const wrapper = renderComponent({ charmstoreSearch: sinon.stub() });
      assert.equal(wrapper.find('Spinner').length, 1);
    });

    it('can display a message if there are no results', function() {
      charmstoreSearch.callsArgWith(1, null, []);
      const wrapper = renderComponent();
      const expected = (
        <div className="twelve-col no-results-container last-col">
          <h1 className="row-title">
            Your search for <strong>spinach</strong>
            {' '}
            returned 0 results
          </h1>
          <p>
            Try a more specific or different query, try other keywords or
            learn how to
            {' '}
            <a href="http://jujucharms.com/docs/authors-charm-writing">
              create your own solution
            </a>.
          </p>
        </div>);
      assert.compareJSX(wrapper.find('.no-results-container'), expected);
    });

    it('can display a message if there is a loading error', function() {
      charmstoreSearch.callsArgWith(1, 'bad wolf', []);
      const wrapper = renderComponent();
      const expected = (
        <div className="twelve-col no-results-container last-col">
          <h1 className="row-title">
            Something went wrong
          </h1>
          <p>
            For some reason the search failed. You could try searching at
            {' '}
            <a href="http://jujucharms.com/store">
              http://jujucharms.com
            </a>
            {' '}or go{' '}
            <span className="link"
              onClick={wrapper.find('.link').prop('onClick')}>
              back
            </span>.
          </p>
        </div>);
      assert.compareJSX(wrapper.find('.no-results-container'), expected);
    });

    it('loads search results', function() {
      var result = {
        name: 'spinach',
        displayName: 'spinach',
        url: 'http://example.com/spinach',
        downloads: 1000,
        owner: 'test-owner',
        promulgated: true,
        id: 'spinach',
        type: 'charm'
      };
      var mockModel = {};
      mockModel.toEntity = sinon.stub().returns(result);
      var mockData = [mockModel];
      window.models.Bundle.returns(mockModel);
      var charmstoreSearch = sinon.stub().callsArgWith(1, null, mockData);
      const wrapper = renderComponent({
        charmstoreSearch
      });
      const instance = wrapper.instance();
      assert.isTrue(charmstoreSearch.calledOnce,
        'search function not called');
      assert.isTrue(mockModel.toEntity.callCount == mockData.length,
        'all models not converted to plain old objects');
      var data = instance.state.data;
      assert.equal(data.text, 'spinach',
        'search text not set to the query');
      assert.equal(data.solutionsCount, mockData.length,
        'total results returned is incorrect');
    });

    it('can render the promulgated search results', function() {
      const sortItems = [{
        label: 'Default',
        value: ''
      }, {
        label: 'Most popular',
        value: '-downloads'
      }, {
        label: 'Least popular',
        value: 'downloads'
      }, {
        label: 'Name (a-z)',
        value: 'name'
      }, {
        label: 'Name (z-a)',
        value: '-name'
      }, {
        label: 'Author (a-z)',
        value: 'owner'
      }, {
        label: 'Author (z-a)',
        value: '-owner'
      }];
      const seriesItems = [{
        label: 'All',
        value: ''
      }, {
        label: 'Vivid Vervet 15.04',
        value: 'vivid'
      }, {
        label: 'Wily Werewolf 15.10',
        value: 'wily'
      }];
      const wrapper = renderComponent({
        series: 'wily',
        sort: '-name',
        type: 'charm'
      });
      const expected = (
        <div className="search-results">
          <div className="row no-padding-top">
            <div className="inner-wrapper list-block">
              <div className="twelve-col list-block__title no-margin-bottom">
                Your search for &lsquo;{'spinach'}&rsquo; returned {4}{' '}
                results.
              </div>
              <div className="list-block__filters">
                <SearchResultsTypeFilter
                  changeState={sinon.stub()}
                  currentType="charm" />
                <div className="six-col last-col">
                  <div className="list-block__filters--selects">
                    <form>
                      <SearchResultsSelectFilter
                        changeState={sinon.stub()}
                        currentValue="-name"
                        filter='sort'
                        items={sortItems}
                        label="Sort by" />
                      <SearchResultsSelectFilter
                        changeState={sinon.stub()}
                        currentValue="wily"
                        filter='series'
                        items={seriesItems}
                        label="Series" />
                    </form>
                  </div>
                </div>
              </div>
              <div className="entity-search-results">
                <div>
                  <div className="clearfix promulgated-results">
                    <h4>
                      Recommended <span className="count">({2})</span>
                    </h4>
                    <ul className="list-block__list">
                      <SearchResultsItem
                        acl={acl}
                        addToModel={addToModel}
                        changeState={sinon.stub()}
                        generatePath={generatePath}
                        item={results[0]}
                        key="~test-owner/mysql-one" />
                      <SearchResultsItem
                        acl={acl}
                        addToModel={addToModel}
                        changeState={sinon.stub()}
                        generatePath={generatePath}
                        item={results[1]}
                        key="~test-owner/mysql-two" />
                    </ul>
                  </div>
                  <div className="clearfix community-results">
                    <div className="button-wrapper--ruled">
                      <GenericButton
                        action={wrapper.find('GenericButton').prop('action')}
                        extraClasses="show-community-button"
                        type="inline-neutral">
                        Show 2 community results
                      </GenericButton>
                    </div>
                    <div
                      className="clearfix community-results__content hidden">
                      <h4>Community <span className="count">({2})</span></h4>
                      <ul className="list-block__list">
                        <SearchResultsItem
                          acl={acl}
                          addToModel={addToModel}
                          changeState={sinon.stub()}
                          generatePath={generatePath}
                          item={results[2]}
                          key="~test-owner/mysql-three" />
                        <SearchResultsItem
                          acl={acl}
                          addToModel={addToModel}
                          changeState={sinon.stub()}
                          generatePath={generatePath}
                          item={results[3]}
                          key="~test-owner/mysql-four" />
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>);
      assert.compareJSX(wrapper, expected);
    });

    it('will show community results', function() {
      const wrapper = renderComponent();
      const instance = wrapper.instance();
      instance._toggleCommunityResults();
      wrapper.update();
      assert.equal(
        wrapper.find('.community-results__content').prop('className').includes(
          'hidden'),
        false);
    });

    it('aborts existing requests before making new ones', function() {
      const abort = sinon.stub();
      charmstoreSearch.returns({abort: abort});
      const wrapper = renderComponent();
      assert.equal(abort.callCount, 0);
      wrapper.setProps({ query: 'apache2' });
      assert.equal(abort.callCount, 1);
    });
  });

  describe('unit tests', function() {
    var searchResults;

    beforeEach(function() {
      searchResults = new SearchResults({});
    });

    afterEach(function() {
      searchResults = null;
    });

    it('collapses identical charms with different series', function() {
      var entities = [
        {id: 'foo', name: 'foo', owner: 'bar', type: 'charm', series: 'trusty'},
        {id: 'foo', name: 'foo', owner: 'bar', type: 'charm',
          series: 'precise'},
        {id: 'foo', name: 'foo', owner: 'baz', type: 'charm', series: 'vivid'}
      ];
      var actual = searchResults._collapseSeries(entities),
          first = entities[0],
          last = entities[2];
      var expected = [{
        id: first.name,
        name: first.name,
        owner: first.owner,
        type: first.type,
        series: [{name: 'trusty', storeId: ''}, {name: 'precise', storeId: ''}],
        downloads: 0,
        storeId: ''
      }, {
        id: last.name,
        name: last.name,
        owner: last.owner,
        type: last.type,
        series: [{name: 'vivid', storeId: ''}],
        downloads: 0,
        storeId: ''
      }];
      assert.deepEqual(actual, expected);
    });

    it('can collapse charms when the id contains "cs:"', () => {
      const entities = [
        {id: 'cs:foo', name: 'foo', owner: 'bar', type: 'charm',
          series: 'trusty'},
        {id: 'foo', name: 'foo', owner: 'bar', type: 'charm',
          series: 'precise'},
        {id: 'foo', name: 'foo', owner: 'baz', type: 'charm', series: 'vivid'}
      ];
      const actual = searchResults._collapseSeries(entities);
      assert.equal(actual.length, 2);
    });

    it('aggregates downloads when collapsing charms', function() {
      var entities = [
        {name: 'c1', id: 'c1', owner: 'o1', type: 'c', series: 's1',
          downloads: 1},
        {name: 'c1', id: 'c1', owner: 'o1', type: 'c', series: 's2',
          downloads: 5},
        {name: 'c1', id: 'c1', owner: 'o2', type: 'c', series: 's3',
          downloads: 3}
      ];
      var actual = searchResults._collapseSeries(entities);
      assert.equal(actual[0].downloads, 6, 'downloads not aggregated');
      assert.equal(actual[1].downloads, 3, 'downloads improperly aggregated');
    });

    it('maintains sort order when collapsing charms', function() {
      var entities = [
        {id: 'foo1', name: 'foo1', owner: 'bar', type: 'c', series: 's1',
          downloads: 6},
        {id: 'foo2', name: 'foo2', owner: 'bar', type: 'c', series: 's1',
          downloads: 5},
        {id: 'foo1', name: 'foo1', owner: 'bar', type: 'c', series: 's2',
          downloads: 4},
        {id: 'foo3', name: 'foo3', owner: 'bar', type: 'c', series: 's1',
          downloads: 4},
        {id: 'foo2', name: 'foo2', owner: 'bar', type: 'c', series: 's1',
          downloads: 3},
        {id: 'foo3', name: 'foo3', owner: 'bar', type: 'c', series: 's3',
          downloads: 3},
        {id: 'foo3', name: 'foo3', owner: 'bar', type: 'c', series: 's4',
          downloads: 3},
        {id: 'foo3', name: 'foo3', owner: 'bar', type: 'c', series: 's5',
          downloads: 3}
      ];
      var actual = searchResults._collapseSeries(entities);
      assert.equal(actual[0].name, 'foo1',
        'foo1 did not maintain sort position');
      assert.equal(actual[0].downloads, 10,
        'foo1 downloads not aggregated');
      assert.equal(actual[1].name, 'foo2',
        'foo2 did not maintain sort position');
      assert.equal(actual[1].downloads, 8,
        'foo2 downloads not aggregated');
      assert.equal(actual[2].name, 'foo3',
        'foo3 did not maintain sort position');
      assert.equal(actual[2].downloads, 13,
        'foo3 downloads not aggregated');
    });

    it('sorts the series within collapsed results', function() {
      var entities = [
        {name: 'c1', id: 'c1', owner: 'o1', type: 'c', series: 'trusty'},
        {name: 'c1', id: 'c1', owner: 'o1', type: 'c', series: 'precise'},
        {name: 'c1', id: 'c1', owner: 'o1', type: 'c', series: 'vivid'}
      ];
      var actual = searchResults._collapseSeries(entities),
          actualSeries = actual[0].series,
          seriesNames = [];
      for (var i = 0, l = actualSeries.length; i < l; i++) {
        seriesNames.push(actualSeries[i].name);
      }
      assert.deepEqual(seriesNames, ['vivid', 'trusty', 'precise']);
    });

    it('de-dupes the series within collapsed results', function() {
      var entities = [
        {name: 'c1', id: 'c1', owner: 'o1', type: 'c', series: 'trusty'},
        {name: 'c1', id: 'c1', owner: 'o1', type: 'c', series: 'precise'},
        {name: 'c1', id: 'c1', owner: 'o1', type: 'c', series: 'trusty'}
      ];
      var actual = searchResults._collapseSeries(entities),
          actualSeries = actual[0].series,
          seriesNames = [];
      for (var i = 0, l = actualSeries.length; i < l; i++) {
        seriesNames.push(actualSeries[i].name);
      }
      assert.deepEqual(seriesNames, ['trusty', 'precise']);
    });

    it('properly handles a successful search', function() {
      var _changeActiveComponent = searchResults._changeActiveComponent;
      searchResults._changeActiveComponent = sinon.stub();
      var query = 'spinach';
      searchResults.props = {
        query: query
      };
      var results = [{
        name: 'spinach',
        displayName: 'spinach',
        url: 'http://example.com/spinach',
        downloads: 1000,
        owner: 'test-owner',
        promulgated: true,
        id: 'spinach',
        type: 'charm'
      }, {
        name: 'red spinach',
        displayName: 'red spinach',
        url: 'http://example.com/red-spinach',
        downloads: 1000,
        owner: 'test-owner',
        promulgated: false,
        id: 'red-spinach',
        type: 'charm'
      }];
      var rawResults = results.map(function(obj) {
        var m = {};
        m.toEntity = sinon.stub().returns(obj);
        return m;
      });
      var expected = {
        text: 'spinach',
        solutionsCount: 2,
        communityResults: [results[1]],
        promulgatedResults: [results[0]]
      };
      searchResults._collapseSeries = sinon.stub().returns(results);
      searchResults.setState = sinon.spy();
      searchResults._searchCallback(null, rawResults);
      var spy = searchResults.setState;
      assert.deepEqual(spy.getCall(0).args[0], {waitingForSearch: false},
        'waitingForSearch flag still set');
      assert.deepEqual(spy.getCall(1).args[0], {data: expected},
        'search data returned is incorrect');
      searchResults._changeActiveComponent = _changeActiveComponent;
    });

    it('passes the right data to the search', function() {
      var query = 'spinach';
      searchResults.setState = sinon.spy();
      var stateSpy = searchResults.setState;
      var searchSpy = sinon.spy();
      searchResults.props = {charmstoreSearch: searchSpy};
      searchResults._searchRequest(query, 'ops');
      assert.deepEqual(stateSpy.getCall(1).args[0], {waitingForSearch: true},
        'waitingForSearch flag is not set');
      assert.deepEqual(searchSpy.getCall(0).args[0],
        {text: query, tags: 'ops'},
        'query not passed in correctly');
    });

    it('passes the optional parameters to the search', function() {
      var query = 'spinach';
      searchResults.setState = sinon.spy();
      var stateSpy = searchResults.setState;
      var searchSpy = sinon.spy();
      searchResults.props = {charmstoreSearch: searchSpy};
      searchResults._searchRequest(query, 'ops', 'bundle', '-name');
      assert.deepEqual(stateSpy.getCall(1).args[0], {waitingForSearch: true},
        'waitingForSearch flag is not set');
      assert.deepEqual(
        searchSpy.getCall(0).args[0],
        {text: query, tags: 'ops', type: 'bundle', sort: '-name'},
        'query not passed in correctly');
    });

    it('decides to search when the query changes', function() {
      var query = 'spinach';
      searchResults.state = {data: {text: query}};
      assert.isFalse(searchResults._shouldSearch({query: query}),
        'Unchanged query should not trigger search');
      assert.isTrue(searchResults._shouldSearch({query: 'foo'}),
        'Changed query should trigger search');
    });

    it('triggers a search request upon component mount', function() {
      searchResults.props = {
        query: 'foobar',
        setPageTitle: sinon.stub()
      };
      searchResults._searchRequest = sinon.spy();
      searchResults.componentDidMount();
      assert.isTrue(searchResults._searchRequest.calledOnce);
    });

    it('triggers a search request when the query changes', function() {
      var nextProps = {query: 'spinach'};
      searchResults.props = {query: 'broccoli'};
      searchResults._searchRequest = sinon.spy();
      var spy = searchResults._searchRequest;
      searchResults.componentWillReceiveProps(nextProps);
      assert.equal(spy.getCall(0).args[0], nextProps.query);
    });

    it('re-renders only after a new search has finished', function() {
      searchResults._shouldSearch = sinon.stub().returns(true);
      searchResults.state = {waitingForSearch: false};
      assert.isTrue(searchResults.shouldComponentUpdate(),
        'Should re-render after new search finished');
      searchResults._shouldSearch = sinon.stub().returns(false);
      searchResults.state = {
        waitingForSearch: false,
        activeComponent: 'loading'
      };
      assert.isFalse(searchResults.shouldComponentUpdate(),
        'Should not re-render without a new search');
      searchResults._shouldSearch = sinon.stub().returns(true);
      searchResults.state = {
        waitingForSearch: true,
        activeComponent: 'loading'
      };
      assert.isFalse(searchResults.shouldComponentUpdate(),
        'Should not re-render when waiting for a search');
    });

    it('will abort the request when unmounting', function() {
      var abort = sinon.stub();
      charmstoreSearch.returns({abort: abort});
      const wrapper = renderComponent();
      wrapper.unmount();
      assert.equal(abort.callCount, 1);
    });

    it('sets the correct ids for entities', function() {
      var _changeActiveComponent = searchResults._changeActiveComponent;
      searchResults._changeActiveComponent = sinon.stub();
      searchResults.props = {
        query: 'mysql'
      };
      var results = [{
        name: 'mysql',
        displayName: 'mysql',
        url: 'http://example.com/mysql',
        downloads: 1000,
        owner: 'charmers',
        promulgated: true,
        id: 'cs:trusty/mysql-38',
        type: 'charm'
      }, {
        name: 'postgresql-psql',
        displayName: 'postgresql-psql',
        url: 'http://example.com/postgresql',
        downloads: 1000,
        owner: 'stub',
        promulgated: true,
        id: 'cs:~stub/precise/postgresql-psql-9',
        type: 'charm'
      }, {
        name: 'nova-volume',
        displayName: 'nova-volume',
        url: 'http://example.com/nova-volume',
        downloads: 1000,
        owner: 'charmers',
        promulgated: true,
        id: 'cs:precise/nova-volume-6',
        type: 'charm',
        storeId: 'cs:precise/nova-volume-6'
      }, {
        name: 'mssql-express',
        displayName: 'mssql-express',
        url: 'http://example.com/mssql-express',
        downloads: 1000,
        owner: 'cloudbaseit',
        promulgated: true,
        id: 'cs:~cloudbaseit/win2012r2/mssql-express-1',
        type: 'charm',
        storeId: 'cs:~cloudbaseit/win2012r2/mssql-express-1'
      }];
      var rawResults = results.map(function(obj) {
        var m = {};
        m.toEntity = sinon.stub().returns(obj);
        return m;
      });
      searchResults._collapseSeries = sinon.stub().returns(results);
      var setState = sinon.stub();
      searchResults.setState = setState;
      searchResults._searchCallback(null, rawResults);
      var actualResults = setState.getCall(1).args[0].data.promulgatedResults;
      assert.deepEqual(actualResults[0].storeId,
        'cs:~charmers/trusty/mysql-38');
      assert.deepEqual(actualResults[1].storeId,
        'cs:~stub/precise/postgresql-psql-9');
      assert.deepEqual(actualResults[2].storeId,
        'cs:~charmers/precise/nova-volume-6');
      assert.deepEqual(actualResults[3].storeId,
        'cs:~cloudbaseit/win2012r2/mssql-express-1');
      searchResults._changeActiveComponent = _changeActiveComponent;
    });
  });
});
