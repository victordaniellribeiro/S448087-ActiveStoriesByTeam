Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',


    _projectId: undefined,
    _mapProjects: undefined,

    _releaseId: undefined,
    _releaseName: undefined,

    _iterationId: undefined,
    _iterationName: undefined,

    _includeDefects: false,


    items:[
        {
            xtype:'container',
            itemId:'header',
            cls:'header'
        },
        {
            xtype:'container',
            itemId:'bodyContainer',
			width:'100%',
			autoScroll:true
        }
    ],


    launch: function() {
        //Write app code here

        //API Docs: https://help.rallydev.com/apps/2.1/doc/


        var context =  this.getContext();
        var project = context.getProject()['ObjectID'];
        this._projectId = project;

        console.log('Project:', this._projectId);


        this.myMask = new Ext.LoadMask({
            msg: 'Please wait...',
            target: this
        });

        var releaseComboBox = Ext.create('Rally.ui.combobox.ReleaseComboBox', {
			fieldLabel: 'Choose Release',
			width: 400,
			itemId: 'releasaeComboBox',
			allowClear: true,
			showArrows: false,
			scope: this,
			listeners: {
				ready: function(combobox) {
					var release = combobox.getRecord();

					//this._initDate = Rally.util.DateTime.toIsoString(release.get('ReleaseStartDate'),true);
					//this._endDate = Rally.util.DateTime.toIsoString(release.get('ReleaseDate'),true);
					this._releaseId = release.get('ObjectID');
					this._releaseName = combobox.getRecord().get('Name');  
				},
				select: function(combobox, records) {
					var release = records[0];

					//this._initDate = Rally.util.DateTime.toIsoString(release.get('ReleaseStartDate'),true);
					//this._endDate = Rally.util.DateTime.toIsoString(release.get('ReleaseDate'),true);
					this._releaseId = release.get('ObjectID');
					this._releaseName = combobox.getRecord().get('Name');  
				},
				scope: this
			}
		});

		var iterationComboBox = Ext.create('Rally.ui.combobox.IterationComboBox', {
			fieldLabel: 'Choose Iteration',
			width: 400,
            itemId: 'iterationComboBox',
            allowClear: true,
            showArrows: false,
            scope: this,
            listeners: {
                ready: function(combobox) {
                	var iteration = combobox.getRecord();
                	this._iterationId = iteration.get('ObjectID');
                	this._iterationName = iteration.get('Name');

                },
                select: function(combobox, records, opts) {
                    var iteration = records[0];
                	this._iterationId = iteration.get('ObjectID');
                	this._iterationName = iteration.get('Name');
                },
                scope: this
            }

        });

        var searchButton = Ext.create('Rally.ui.Button', {
        	text: 'Search',
        	margin: '10 10 10 100',
        	scope: this,
        	handler: function() {
        		//handles search
        		//console.log(initDate, endDate);
        		this._doSearch();
        		//this._loadEndData(projectId, this._releaseId, null);
        	}
        });

        
        this.down('#header').add([
		{
			xtype: 'panel',
			autoWidth: true,
			layout: 'hbox',

			items: [{
				xtype: 'panel',
				title: 'Filter:',
				flex: 3,
				align: 'stretch',
				autoHeight: true,
				bodyPadding: 10,
				items: [{
		            xtype      : 'radiogroup',
		            items: [
		                {
		                	xtype	  : 'radiofield',				            
		                    id        : 'radio1',
		                    name      : 'parameter',
		                    boxLabel  : 'Release',
		                    padding: '0 10 0 0',				            
		                    inputValue: 'r'
		                }, {
		                    boxLabel  : 'Iteration',
		                    name      : 'parameter',
		                    padding: '0 10 0 0',			            
		                    inputValue: 'i',
		                    id        : 'radio2'
		                }, {
		                    boxLabel  : 'All',
		                    name      : 'parameter',
		                    padding: '0 10 0 0',			            
		                    inputValue: 'a',
		                    id        : 'radio3'
		                }
		            ],
		            listeners: {
				        change: function(field, newValue, oldValue) {
				            var value = newValue.parameter;
				            this._searchParameter = value;

				            console.log('value radio:', value);

				            if (value == 'r') {
				            	releaseComboBox.show();
				            	iterationComboBox.hide();
				            } else if (value == 'i') {
				            	releaseComboBox.hide();
				            	iterationComboBox.show();
				            } else {
				            	releaseComboBox.hide();
				            	iterationComboBox.hide();
				            }				            
				        },
				        scope: this
				    }
		        }, {
		        	xtype: 'fieldcontainer',
		        	defaultType: 'checkboxfield',
		            //fieldLabel : 'Include Defects & TestSets',	            
		            items: [
		                {
		                	boxLabel  : 'Include Defects & TestSets',
		                    id        : 'include',
		                    name      : 'include',
		                    padding: '0 10 0 0',			            
		                    inputValue: 'i',
		                    listeners: {
						        change: function(field, newValue, oldValue) {
						            var include = newValue;
						            this._includeDefects = include;

						            console.log('value check:', include);
						        },
						        scope: this
						    }
		                }
		            ],
		            
		        }]
			}]
		},
		{
			xtype: 'panel',
			items: [
				releaseComboBox,
				iterationComboBox,
				searchButton
			]
		}]);

		releaseComboBox.hide();
    	iterationComboBox.hide();
    },


    _doSearch: function() {
    	this.myMask.show();
    	
    	var types = this._getTypes();
    	var filter = this._getFilter();

        var featureStore = Ext.create('Rally.data.wsapi.artifact.Store', {
            models: types,
            fetch: ['Name', 
            		'FormattedID',
            		'Blocked', 
            		'ScheduleState',
            		'Owner',
            		'Project'
            		],
            limit: Infinity,
            context: {
                project: '/project/' + this._projectId, //null to search all workspace
                projectScopeUp: false,
                projectScopeDown: true,
            },
            // filters: [filter],
            sorters: [{
                property: 'FormattedID',
                direction: 'ASC'
            }]
        });

        if (filter) {
        	featureStore.addFilter(filter);
        }


        featureStore.load().then({
			success: function(records) {
				console.log('records', records);

				this._mapProjects = new Ext.util.MixedCollection();


				_.each(records, function(story) {
					var project = story.get('Project');

					if (!this._mapProjects.containsKey(project.Name)) {
						artifacts = [];
						artifacts.push(story);
						this._mapProjects.add(project.Name, artifacts);
					} else {
						this._mapProjects.get(project.Name).push(story);
					}
				}, this);


				console.log('projects', this._mapProjects);

				var multis = [];

				this._mapProjects.eachKey(function(projectName, stories) {

					var multi = new Ext.util.MixedCollection();
					

					_.each(stories, function(story) {
						var owner = story.get('Owner');
						console.log('owner', owner);

						var ownerName;
						if (owner) {
							ownerName = owner._refObjectName;
						} else {
							ownerName = 'No Owner';
						}


						if (!multi.containsKey(ownerName)) {
							var storArr = [];
							storArr.push(story);
							multi.add(ownerName, storArr);
						} else {
							multi.get(ownerName).push(story);
						}
						

					}, this);
					multis.push(multi);

				}, this);



				console.log(multis);
				this.down('#bodyContainer').removeAll(true);

				this._addPanel(multis);

				this.myMask.hide();

			},
			scope: this
		});
    },


    _getTypes: function() {
    	var types = ['HierarchicalRequirement'];

    	if (this._includeDefects) {
    		types.push('Defect');
    		types.push('TestSet');
    	}

    	return types;
    },



    _getFilter: function() {
    	var blockedFilter = Ext.create('Rally.data.QueryFilter', {
			property: 'Blocked',
			operator: '=',
			value: false
		});

		var filter;


        if (this._searchParameter == 'r') {
        	var releaseFilter = Ext.create('Rally.data.QueryFilter', {
				property: 'Release.name',
				operator: '=',
				value: this._releaseName
			});

        	// filter = blockedFilter.and(releaseFilter);
        	filter = releaseFilter;

        } else if (this._searchParameter == 'i') {
        	var iterationFilter = Ext.create('Rally.data.QueryFilter', {
				property: 'Iteration.Name',
                operator: '=',
                value: this._iterationName
			});

        	// filter = blockedFilter.and(iterationFilter);
        	filter = iterationFilter;
        }

    	return filter;
    },


    _addPanel: function(multiMap) {

    	var container = Ext.create('Ext.container.Container', {
			layout: {
				type: 'hbox',
				align: 'stretch',
				padding: 5
			},
			width: '100%',
            autoScroll: true
        });

    	this.down('#bodyContainer').add(container);


    	_.each(multiMap, function(map) {
    		//map with owner and its stories
    		//console.log('map', map.first());

    		var projectName = map.first()[0].get('Project').Name;
			console.log(projectName);


			var store = this._createStore(map);
			var grid = this._createGrid(store);
			console.log('store', store.getCount());

	    	var panel = Ext.create('Ext.panel.Panel', {
				title: projectName,
				autoScroll: true,
				width: 300,
	            layout: {
					type: 'vbox',
					align: 'stretch',
					padding: 5
				},
	            padding: 5,            
	            items: [
	                grid
	            ]
	        });

	        container.add(panel);
		}, this);

    	
    },


    _createGrid: function(store) {
    	console.log('creating grid for:', store);

    	var grid = Ext.create('Rally.ui.grid.Grid', {
    		//width: 1600,
			viewConfig: {
				stripeRows: true,
				enableTextSelection: true
			},
			showRowActionsColumn: false,
			showPagingToolbar: false,
			enableEditing: false,
    		itemId : 'iterationScoreGrid',
    		store: store,

    		columnCfgs: [
                {
                    text: 'Name',
                    dataIndex: 'name',
                    flex: 3
                },
                {
                    text: 'Stories In Progress',
                    dataIndex: 'count',
                    flex: 2
                },
                {
                	text: 'Blocked',
                    dataIndex: 'blocked',
                    flex: 2	
                }
            ]
        });

        return grid;
    },


    _createStore: function(map) {
    	//map of onwer per stories
    	var rows = [];

    	map.eachKey(function(ownerName, stories) {

    		var storiesInProgress = 0;
    		var storiesBlocked = 0;

    		_.each(stories, function(story) {
    			var state = story.get('ScheduleState');
    			var blocked = story.get('Blocked');


    			if (blocked) {
    				storiesBlocked += 1;
    			} else  if ('Defined' === state || 'In-Progress' === state) {
    				//console.log('state', state);
    				storiesInProgress += 1;
    			}    		  
    		}, this);


    		if (storiesInProgress > 0 || storiesBlocked > 0) {
	    		rows.push({
	    			name: ownerName,
	    			count: storiesInProgress,
	    			blocked: storiesBlocked
	    		});
    		}

		}, this);



		var store = Ext.create('Ext.data.JsonStore', {
			fields: ['name', 
                    'count',
                    'blocked']
        });

        store.loadData(rows);

		return store;
    }

});
