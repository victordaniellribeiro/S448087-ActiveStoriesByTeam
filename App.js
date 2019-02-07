Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',


    _projectId: undefined,
    _mapProjects: undefined,

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


        var filter = {
            property: 'Blocked',
            operator: '=',
            value: false
        };


        var featureStore = Ext.create('Rally.data.wsapi.artifact.Store', {
            models: ['HierarchicalRequirement'],
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
            filters: [filter],
            sorters: [{
                property: 'FormattedID',
                direction: 'ASC'
            }]
        });


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

						if (owner) {
							var ownerName = owner._refObjectName;

							if (!multi.containsKey(ownerName)) {
								var storArr = [];
								storArr.push(story);
								multi.add(ownerName, storArr);
							} else {
								multi.get(ownerName).push(story);
							}
						}

					}, this);
					multis.push(multi);

				}, this);



				console.log(multis);
				this.down('#bodyContainer').removeAll(true);

				this._addPanel(multis);

			},
			scope: this
		});
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

    		_.each(stories, function(story) {
    			var state = story.get('ScheduleState');

    			if ('Defined' === state || 'In-Progress' === state) {
    				//console.log('state', state);
    				storiesInProgress +=1;
    			}    		  
    		}, this);


    		if (storiesInProgress > 1) {
	    		rows.push({
	    			name: ownerName,
	    			count: storiesInProgress
	    		});
    		}

		}, this);



		var store = Ext.create('Ext.data.JsonStore', {
			fields: ['name', 
                    'count']
        });

        store.loadData(rows);

		return store;

    }

});
