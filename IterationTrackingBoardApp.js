(function () {
    var Ext = window.Ext4 || window.Ext;

    var defaultGridColumns = ['Name', 'ScheduleState', 'Blocked', 'PlanEstimate', 'Tasks', 'TaskEstimateTotal', 'TaskRemainingTotal', 'Owner', 'Defects', 'Discussion'];

    /**
     * Iteration Tracking Board App
     * The Iteration Tracking Board can be used to visualize and manage your User Stories and Defects within an Iteration.
     */
    Ext.define('Rally.apps.iterationtrackingboard.IterationTrackingBoardApp', {
        extend: 'Rally.app.TimeboxScopedApp',
        requires: [
            'Rally.data.Ranker',
            'Rally.data.wsapi.ModelFactory',
            'Rally.data.wsapi.TreeStoreBuilder',
            'Rally.ui.dialog.CsvImportDialog',
            'Rally.ui.gridboard.GridBoard',
            'Rally.apps.iterationtrackingboard.IterationTrackingTreeGrid',
            'Rally.ui.cardboard.plugin.FixedHeader',
            'Rally.ui.cardboard.plugin.Print',
            'Rally.ui.gridboard.plugin.GridBoardActionsMenu',
            'Rally.ui.gridboard.plugin.GridBoardAddNew',
            'Rally.ui.gridboard.plugin.GridBoardCustomFilterControl',
            'Rally.ui.gridboard.plugin.GridBoardFieldPicker',
            'Rally.ui.cardboard.plugin.ColumnPolicy',
            'Rally.ui.gridboard.plugin.GridBoardToggleable',
            'Rally.ui.grid.plugin.TreeGridExpandedRowPersistence',
            'Rally.ui.grid.plugin.TreeGridChildPager',
            'Rally.ui.gridboard.plugin.GridBoardCustomView',
            'Rally.ui.filter.view.ModelFilter',
            'Rally.ui.filter.view.OwnerFilter',
            'Rally.ui.filter.view.OwnerPillFilter',
            'Rally.ui.filter.view.TagPillFilter',
            'Rally.app.Message',
            'Rally.apps.iterationtrackingboard.StatsBanner',
            'Rally.apps.iterationtrackingboard.StatsBannerField',
            'Rally.clientmetrics.ClientMetricsRecordable',
            'Rally.apps.common.RowSettingsField'
        ],

        mixins: [
            'Rally.clientmetrics.ClientMetricsRecordable'
        ],
        componentCls: 'iterationtrackingboard',
        alias: 'widget.rallyiterationtrackingboard',

        settingsScope: 'project',
        userScopedSettings: true,
        scopeType: 'iteration',
        autoScroll: false,

        config: {
            defaultSettings: {
                showCardAge: true,
                showStatsBanner: true,
                cardAgeThreshold: 3
            },
            includeStatsBanner: true
        },
		
		items: [{
            xtype: 'container',
            cls: 'header'
        },
		/*
		{
			xtype: 'container',
            items:[{
				xtype: 'container',
                itemId: 'featureComboBoxContainer'
			}]
		}
		*/
		
		{
			xtype: 'container',
            itemId: 'featureComboBox'
		}
		],
		
		launch: function() {
			
			this.features = null;
			this.requiremnts = null; 
			app=this;
            var context = this.getContext();
			
            if (this._hasScope()) {
                this.onScopedDashboard = true;
                this.onTimeboxScopeChange(context.getTimeboxScope());
            } else {
                this.onScopedDashboard = false;
                this._addScopeComboBox();
				this._addFeatureComboBox();
            }
        },	
		
        modelNames: ['User Story', 'Defect', 'Defect Suite', 'Test Set'],

        constructor: function(config) {
            _.defaults(config, { layout: 'anchor'});

            this.callParent(arguments);
        },
		
		_addFeatureComboBox:function(){
			this.featureComboBox  = Ext.create('Rally.ui.combobox.ComboBox', {
			//itemId:'featureComboBox',
            fieldLabel: 'Choose a Feature:',
            multiselect: false, // not sure if this should be set to true or false (ask about practices)
            shouldRespondToScopeChange: true,
            editable: false,
            allowNoEntry: true,
            noEntryValue: null,
            autoWidth: true,
            grow: true,
            growToLongestValue: true,
            storeConfig: {
                model: 'PortfolioItem/Feature',
                fetch: ['FormattedID', 'Name'],
                context: {
                    project: '/project/28077133199',//pointing to Hudson
                    projectScopeDown: true
                },
                autoLoad: true,
                remoteSort: false,
                remoteFilter: true
            },
            stateId: 'featureSelection',
            stateful: true,
            lastQuery: '',
            listConfig: {
                itemTpl: '{FormattedID}:  {Name}'
            },
            listeners: {
                select: function(combo, records, eOpts) {
                    this.features = records;
					console.log('this.features1',this.features);
                    this.onScopeChange();
					console.log('calling onFeatureScopeChange');
                }.bind(this),
                ready: function(combo, eOpts) {
                    this.features = combo.lastSelection;
					this.onScopeChange();
                    //this.addRequiremntComboBox();
                }.bind(this)
            }
        });
        this.down('#featureComboBox').add(this.featureComboBox);
		},
		
    onFeatureScopeChange: function () {
        //this.requiremntComboBox.doQuery(this._requiremntBoxFilterByFeature().toString(), false, false);
        //this.requiremntComboBox.collapse();

        this.requiremnts = null;

        //this.down('#gridBoard').filter(this._getGridboardFilters(), true, true);
    },

    onRequiremntScopeChange: function () {
        //this.getComponent('gridBoard').filter(this._getGridboardFilters(), true, true);
    },

    /************************************************************************************
    ********* Filter the requiremnt combobox based on the feature chosen by user ********
    ************************************************************************************/
    _requiremntBoxFilterByFeature: function () {
        if (this.features !== null || this.features !== undefined) {
            var feature = this.features[0],
                filter = null;
            if (feature.data.ObjectID === null || feature.data.ObjectID === undefined) {
                filter = '(Parent.Parent.FormattedID = "PR11")';
            } else {
                filter = '(Parent.ObjectID = "' + feature.data.ObjectID + '")';
            }
            return Rally.data.wsapi.Filter.fromQueryString(filter);
        }
    },

    /************************************************************************************
    ************** Used to add user's feature choice to filter for the grid *************
    ************************************************************************************/
    _filterByFeature: function() {
		console.log('this.features2',this.features);
		console.log('#featureComboBox = '+this.down('#featureComboBox').getComponent('#featureComboBox'));
		//this.features=this.down('#featureComboBox').getComponent('#featureComboBox');
        if (this.features !== null || this.features !== undefined) {
            return _.compact(_.map(Ext.Array.from(this.features), function(feature) {
                var filter = null;
                if (feature.data.ObjectID === null || feature.data.ObjectID === undefined) {
                    filter = '(Requiremnt.Parent.Parent.FormattedID = "PR11")';
                } else {
                    filter = '(Requiremnt.Parent.ObjectID = "' + feature.data.ObjectID + '")';
                }
                return Rally.data.wsapi.Filter.fromQueryString(filter);
            }));
        }
    },

    /************************************************************************************
    ************* Used to add user's requiremnt choice to filter for the grid ***********
    ************************************************************************************/
		_filterByRequiremnt: function() {
			if (this.requiremnts != null && this.requiremnts.length > 0) {
				var requiremnt = this.requiremnts[0];
				if (requiremnt.data.ObjectID != null) {
					filter = '(Requiremnt.ObjectID = "' + requiremnt.data.ObjectID.toString() + '")';
					return Rally.data.wsapi.Filter.fromQueryString(filter);
				}
			}
			return null;
		},

        onScopeChange: function() {
            if(!this.rendered) {
                this.on('afterrender', this.onScopeChange, this, {single: true});
                return;
            }

            var me = this;

            this.suspendLayouts();

            var grid = this.down('rallytreegrid');
            if (grid) {
                // reset page count to 1.
                // must be called here to reset persisted page count value.
                grid.fireEvent('storecurrentpagereset');
            }

            if (this._shouldShowStatsBanner()){
                this._addStatsBanner();
            }

            this._buildGridStore().then({
                success: function(gridStore) {
                    var model = gridStore.model;
                    if(_.isFunction(model.getArtifactComponentModels)) {
                        this.modelNames = _.intersection(_.pluck(gridStore.model.getArtifactComponentModels(),'displayName'),this.modelNames);
                    } else {
                        this.modelNames = [model.displayName];
                    }
                    this._addGridBoard(gridStore);
                },
                scope: this
            }).always(function() {
                me.resumeLayouts(true);
            });
        },

        getSettingsFields: function () {
            var fields = this.callParent(arguments);

            fields.push({
                type: 'cardage',
                config: {
                    margin: '0 0 0 80',
                    width: 300
                }
            });

            fields.push({
                name: 'groupHorizontallyByField',
                xtype: 'rowsettingsfield',
                fieldLabel: 'Swimlanes',
                margin: '10 0 0 0',
                mapsToMultiplePreferenceKeys: ['showRows', 'rowsField'],
                readyEvent: 'ready',
                isAllowedFieldFn: function() { return false; },
                explicitFields: [
                    {name: 'Blocked', value: 'Blocked'},
                    {name: 'Owner', value: 'Owner'},
                    {name: 'Sizing', value: 'PlanEstimate'},
                    {name: 'Expedite', value: 'Expedite'}
                ]
            });

            return fields;
        },

        getUserSettingsFields: function () {
            var fields = this.callParent(arguments);

            fields.push({
                xtype: 'rallystatsbannersettingsfield',
                fieldLabel: '',
                mapsToMultiplePreferenceKeys: ['showStatsBanner']
            });

            return fields;
        },

        _buildGridStore: function() {
            var context = this.getContext(),
                config = {
                    context: context.getDataContext(),
                    models: this.modelNames,
                    autoLoad: false,
                    remoteSort: true,
                    root: {expanded: true},
                    enableHierarchy: true,
                    pageSize: this.getGridPageSizes()[1],
                    childPageSizeEnabled: true,
                    fetch: ['PlanEstimate', 'Release', 'Iteration']
                };

            return Ext.create('Rally.data.wsapi.TreeStoreBuilder').build(config);
        },

        _shouldShowStatsBanner: function() {
            return this.includeStatsBanner && this.getSetting('showStatsBanner');
        },

        _addStatsBanner: function() {
           this.remove('statsBanner');
           this.add({
                xtype: 'statsbanner',
                itemId: 'statsBanner',
                context: this.getContext(),
                margin: '0 0 5px 0',
                shouldOptimizeLayouts: this.config.optimizeFrontEndPerformanceIterationStatus,
                listeners: {
                    resize: this._resizeGridBoardToFillSpace,
                    scope: this
                }
           });
        },

        _addGridBoard: function (gridStore) {
            var context = this.getContext();

            this.remove('gridBoard');

            this.gridboard = this.add({
                itemId: 'gridBoard',
                xtype: 'rallygridboard',
                stateId: 'iterationtracking-gridboard',
                context: context,
                plugins: this._getGridBoardPlugins(),
                modelNames: this.modelNames,
                cardBoardConfig: this._getBoardConfig(),
                gridConfig: this._getGridConfig(gridStore),
                layout: 'anchor',
                storeConfig: {
                    useShallowFetch: false,
                    filters: this._getGridboardFilters(gridStore.model)
                },
                listeners: {
                    load: this._onLoad,
                    toggle: this._onToggle,
                    recordupdate: this._publishContentUpdatedNoDashboardLayout,
                    recordcreate: this._publishContentUpdatedNoDashboardLayout,
                    scope: this
                },
                height: Math.max(this._getAvailableGridBoardHeight(), 150)
            });
        },

        _getGridboardFilters: function(model) {
			
			var self = this;
            var timeboxScope = this.getContext().getTimeboxScope(),
                timeboxFilter = timeboxScope.getQueryFilter(),
				featureFilter = this._filterByFeature(),
                //filters = [];
				
				//Solving for Unscheduled Issue -------------------------------------------
				filters = [timeboxFilter];
				
				console.log('featureFilter',featureFilter);
				//console.log('_filterByFeature()',this._filterByFeature());
				console.log('this.getContext().getSubscription().StoryHierarchyEnabled = ',this.getContext().getSubscription().StoryHierarchyEnabled);

				
            if (!timeboxScope.getRecord() && this.getContext().getSubscription().StoryHierarchyEnabled) {
				
				console.log('this.getContext().getSubscription().StoryHierarchyEnabled 2 = ',this.getContext().getSubscription().StoryHierarchyEnabled);
				console.log('timeboxScope.getRecord() = ',timeboxScope.getRecord());
				console.log('-----------------------');
				//console.log('this._createLeafStoriesOnlyFilter(model)',self._createLeafStoriesOnlyFilter(model));
                /*
				timeboxFilter.push(this._createLeafStoriesOnlyFilter(model));
                timeboxFilter.push(this._createUnassociatedDefectsOnlyFilter(model));
				*/
				
				filters.push(this._createLeafStoriesOnlyFilter(model));
                filters.push(this._createUnassociatedDefectsOnlyFilter(model));
            }
			
			if (timeboxFilter != null) {
				filters = filters.concat(timeboxFilter);
			}
		
			if (featureFilter != null) {
				filters = filters.concat(featureFilter);
			}
            
			var finalFilter = filters[0];

        /************************************************************************************
        ******* add all the filters together using AND, no filters are OR'd in this app *****
        ************************************************************************************/
			for (i=1;i<filters.length;i++) {
				if (filters[i] !== null) {
					finalFilter = finalFilter.and(filters[i]);
				}
			}

			return finalFilter;
        },

        _createLeafStoriesOnlyFilter: function(model) {
            var typeDefOid = model.getArtifactComponentModel('HierarchicalRequirement').typeDefOid;
			console.log(typeDefOid);

			console.log('1');
            var userStoryFilter = Ext.create('Rally.data.wsapi.Filter', {
                property: 'TypeDefOid',
                value: typeDefOid
            });

			console.log('2',userStoryFilter);
            var noChildrenFilter = Ext.create('Rally.data.wsapi.Filter', {
                property: 'DirectChildrenCount',
                value: 0
            });

			console.log('3',noChildrenFilter);
            var notUserStoryFilter = Ext.create('Rally.data.wsapi.Filter', {
                property: 'TypeDefOid',
                value: typeDefOid,
                operator: '!='
            });

			console.log('4',notUserStoryFilter);
            return userStoryFilter.and(noChildrenFilter).or(notUserStoryFilter);
        },

        _createUnassociatedDefectsOnlyFilter: function(model) {
            var typeDefOid = model.getArtifactComponentModel('Defect').typeDefOid,
                isADefect = Ext.create('Rally.data.wsapi.Filter', {
                    property: 'TypeDefOid',
                    value: typeDefOid
                }),
                parentRequirementIsScheduled = Ext.create('Rally.data.wsapi.Filter', {
                    property: 'Requirement.Iteration',
                    operator: '!=',
                    value: null
                }),
                hasNoParentRequirement = Ext.create('Rally.data.wsapi.Filter', {
                    property: 'Requirement',
                    operator: '=',
                    value: null
                }),
                isNotADefect = Ext.create('Rally.data.wsapi.Filter', {
                    property: 'TypeDefOid',
                    value: typeDefOid,
                    operator: '!='
                });

            return isADefect.and(parentRequirementIsScheduled.or(hasNoParentRequirement)).or(isNotADefect);
        },

        _getBoardConfig: function() {
            var config = {
                plugins: [
                    {ptype: 'rallycardboardprinting', pluginId: 'print'},
                    {ptype: 'rallyfixedheadercardboard'}
                ],
                columnConfig: {
                    additionalFetchFields: ['PortfolioItem'],
                    plugins: [{
                        ptype: 'rallycolumnpolicy',
                        app: this
                    }],
                    requiresModelSpecificFilters: false
                },
                cardConfig: {
                    showAge: this.getSetting('showCardAge') ? this.getSetting('cardAgeThreshold') : -1
                },
                listeners: {
                    filter: this._onBoardFilter,
                    filtercomplete: this._onBoardFilterComplete
                }
            };

            if (this.getSetting('showRows') && this.getSetting('rowsField')) {
                Ext.merge(config, {
                    rowConfig: {
                        field: this.getSetting('rowsField'),
                        sortDirection: 'ASC'
                    }
                });
            }

            return config;
        },

        _getAvailableGridBoardHeight: function() {
            var height = this.getHeight();
            if (this._shouldShowStatsBanner() && this.down('#statsBanner').rendered) {
                height -= this.down('#statsBanner').getHeight();
            }
            if (this.getHeader()) {
                height -= this.getHeader().getHeight();
            }
            return height;
        },

        _getGridBoardPlugins: function() {
            var plugins = [{
                ptype: 'rallygridboardaddnew'
            }];
            var context = this.getContext();

            plugins.push({
                ptype: 'rallygridboardcustomfiltercontrol',
                filterChildren: true,
                filterControlConfig: {
                    blackListFields: ['Iteration', 'PortfolioItem'],
                    whiteListFields: ['Milestones'],
                    modelNames: this.modelNames,
                    stateful: true,
                    stateId: context.getScopedStateId('iteration-tracking-custom-filter-button')
                },
                showOwnerFilter: true,
                ownerFilterControlConfig: {
                    stateful: true,
                    stateId: context.getScopedStateId('iteration-tracking-owner-filter')
                }
            });

            plugins.push('rallygridboardtoggleable');

            var actionsMenuItems = [
            {
                text: 'Import User Stories...',
                handler: this._importHandler({
                    type: 'HierarchicalRequirement',
                    title: 'Import User Stories'
                })
            }, {
                text: 'Import Tasks...',
                handler: this._importHandler({
                    type: 'Task',
                    title: 'Import Tasks'
                })
            }, {
                text: 'Export...',
                handler: this._exportHandler,
                scope: this
            }];

            actionsMenuItems.push({
                text: 'Print...',
                handler: this._printHandler,
                scope: this
            });

            plugins.push({
                ptype: 'rallygridboardactionsmenu',
                itemId: 'printExportMenuButton',
                menuItems: actionsMenuItems,
                buttonConfig: {
                    iconCls: 'icon-export',
                    toolTipConfig: {
                        html: 'Import/Export/Print',
                        anchor: 'top',
                        hideDelay: 0
                    }
                }
            });

            plugins.push({
                ptype: 'rallygridboardfieldpicker',
                headerPosition: 'left',
                gridFieldBlackList: [
                    'Estimate',
                    'ToDo'
                ],
                boardFieldBlackList: [
                    'Successors',
                    'Predecessors'
                ],
                modelNames: this.modelNames,
                boardFieldDefaults: (this.getSetting('cardFields') && this.getSetting('cardFields').split(',')) ||
                    ['Parent', 'Tasks', 'Defects', 'Discussion', 'PlanEstimate', 'Iteration']
            });

            if (context.isFeatureEnabled('ITERATION_TRACKING_CUSTOM_VIEWS')) {
                plugins.push(this._getCustomViewConfig());
            }

            return plugins;
        },

        setSize: function() {
            this.callParent(arguments);
            this._resizeGridBoardToFillSpace();
        },

        _importHandler: function(options) {
            return _.bind(function() {
                Ext.widget({
                    xtype: 'rallycsvimportdialog',
                    type: options.type,
                    title: options.title,
                    params: {
                        iterationOid: this._getIterationOid()
                    }
                });
            }, this);
        },

        _exportHandler: function() {
            var context = this.getContext();
            var params = {
                cpoid: context.getProject().ObjectID,
                projectScopeUp: context.getProjectScopeUp(),
                projectScopeDown: context.getProjectScopeDown(),
                iterationKey: this._getIterationOid()
            };

            window.location = Ext.String.format('{0}/sc/exportCsv.sp?{1}',
                Rally.environment.getServer().getContextUrl(),
                Ext.Object.toQueryString(params)
            );
        },

        _printHandler: function() {
            var timeboxScope = this.getContext().getTimeboxScope();

            Ext.create('Rally.ui.grid.TreeGridPrintDialog', {
                grid: this.gridboard.getGridOrBoard(),
                treeGridPrinterConfig: {
                    largeHeaderText: 'Iteration Summary',
                    smallHeaderText: timeboxScope.getRecord() ? timeboxScope.getRecord().get('Name') : 'Unscheduled'
                }
            });
        },

        _getIterationOid: function() {
            var iterationId = '-1';
            var timebox = this.getContext().getTimeboxScope();

            if (timebox && timebox.getRecord()) {
                iterationId = timebox.getRecord().getId();
            }
            return iterationId;
        },

        _resizeGridBoardToFillSpace: function() {
            if (this.gridboard) {
                this.gridboard.setHeight(this._getAvailableGridBoardHeight());
            }
        },

        _getCustomViewConfig: function() {
            var customViewConfig = {
                ptype: 'rallygridboardcustomview',
                stateId: 'iteration-tracking-board-app',

                defaultGridViews: [{
                    model: ['UserStory', 'Defect', 'DefectSuite', 'TestSet'],
                    name: 'Defect Status',
                    state: {
                        cmpState: {
                            expandAfterApply: true,
                            columns: [
                                'Name',
                                'State',
                                'Discussion',
                                'Priority',
                                'Severity',
                                'FoundIn',
                                'FixedIn',
                                'Owner'
                            ]
                        },
                        filterState: {
                            filter: {
                                defectstatusview: {
                                    isActiveFilter: false,
                                    itemId: 'defectstatusview',
                                    queryString: '((Defects.ObjectID != null) OR (Priority != null))'
                                }
                            }
                        }
                    }
                }, {
                    model: ['UserStory', 'Defect', 'TestSet', 'DefectSuite'],
                    name: 'Task Status',
                    state: {
                        cmpState: {
                            expandAfterApply: true,
                            columns: [
                                'Name',
                                'State',
                                'PlanEstimate',
                                'TaskEstimate',
                                'ToDo',
                                'Discussions',
                                'Owner'
                            ]
                        },
                        filterState: {
                            filter: {
                                taskstatusview: {
                                    isActiveFilter: false,
                                    itemId: 'taskstatusview',
                                    queryString: '(Tasks.ObjectID != null)'
                                }
                            }
                        }
                    }
                }, {
                    model: ['UserStory', 'Defect', 'TestSet'],
                    name: 'Test Status',
                    state: {
                        cmpState: {
                            expandAfterApply: true,
                            columns: [
                                'Name',
                                'State',
                                'Discussions',
                                'LastVerdict',
                                'LastBuild',
                                'LastRun',
                                'ActiveDefects',
                                'Priority',
                                'Owner'
                            ]
                        },
                        filterState: {
                            filter: {
                                teststatusview: {
                                    isActiveFilter: false,
                                    itemId: 'teststatusview',
                                    queryString: '(TestCases.ObjectID != null)'
                                }
                            }
                        }
                    }
                }]
            };

            customViewConfig.defaultBoardViews = _.cloneDeep(customViewConfig.defaultGridViews);
            _.each(customViewConfig.defaultBoardViews, function(view) {
                delete view.state.cmpState;
            });

            return customViewConfig;
        },

        _getGridConfig: function (gridStore) {
            var context = this.getContext(),
                stateString = 'iteration-tracking-treegrid',
                stateId = context.getScopedStateId(stateString),
                useFixedHeightRows = Ext.isIE && context.isFeatureEnabled('S78815_ITERATON_TREE_GRID_APP_FIXED_ROW_HEIGHT');

            var gridConfig = {
                xtype: 'rallyiterationtrackingtreegrid',
                store: gridStore,
                columnCfgs: this._getGridColumns(),
                summaryColumns: this._getSummaryColumnConfig(),
                enableInlineAdd: true,
                expandAllInColumnHeaderEnabled: true,
                inlineAddConfig: {
                    enableAddPlusNewChildStories: false
                },
                enableBulkEdit: true,
                pagingToolbarCfg: {
                    pageSizes: this.getGridPageSizes(),
                    comboboxConfig: {
                        defaultSelectionPosition: 'last'
                    }
                },
                plugins: [],
                stateId: stateId,
                stateful: true,
                variableRowHeight: !useFixedHeightRows,
                bufferedRenderer: true
            };

            gridConfig.plugins.push({
                ptype: 'rallytreegridexpandedrowpersistence'
            });

            return gridConfig;
        },

        _getSummaryColumnConfig: function () {
            var taskUnitName = this.getContext().getWorkspace().WorkspaceConfiguration.TaskUnitName,
                planEstimateUnitName = this.getContext().getWorkspace().WorkspaceConfiguration.IterationEstimateUnitName;

            return [
                {
                    field: 'PlanEstimate',
                    type: 'sum',
                    units: planEstimateUnitName
                },
                {
                    field: 'TaskEstimateTotal',
                    type: 'sum',
                    units: taskUnitName
                },
                {
                    field: 'TaskRemainingTotal',
                    type: 'sum',
                    units: taskUnitName
                },
                {
                    field: 'TaskActualTotal',
                    type: 'sum',
                    units: taskUnitName
                }
            ];
        },

        _getGridColumns: function (columns) {
            return columns ? _.without(columns, 'FormattedID') : defaultGridColumns;
        },

        _onLoad: function () {
            this._publishContentUpdated();

            var additionalMetricData = {};

            if  (this.gridboard.getToggleState() === 'board') {
                additionalMetricData = {
                    miscData: {
                        swimLanes: this.getSetting('showRows'),
                        swimLaneField: this.getSetting('rowsField')
                    }
                };
            }

            this.recordComponentReady(additionalMetricData);

            if (Rally.BrowserTest) {
                Rally.BrowserTest.publishComponentReady(this);
            }
        },

        _onBoardFilter: function () {
            this.setLoading(true);
        },

        _onBoardFilterComplete: function () {
            this.setLoading(false);
        },

        _hidePrintButton: function(hide, gridboard) {
            var button, menuItem;

            if (gridboard) {
                button = _.find(gridboard.plugins, {itemId: 'printExportMenuButton'});

                if (button) {
                    menuItem = _.find(button.menuItems, {text: 'Print...'});

                    if (menuItem) {
                        menuItem.hidden = hide;
                    }
                }
            }
        },

        _onToggle: function (toggleState, gridOrBoard, gridboard) {
            var appEl = this.getEl();

            if (toggleState === 'board') {
                appEl.replaceCls('grid-toggled', 'board-toggled');
                this._hidePrintButton(true, gridboard);
            } else {
                appEl.replaceCls('board-toggled', 'grid-toggled');
                this._hidePrintButton(false, gridboard);
            }
            this._publishContentUpdated();
        },

        _publishContentUpdated: function () {
            this.fireEvent('contentupdated');
        },

        _publishContentUpdatedNoDashboardLayout: function () {
            this.fireEvent('contentupdated', {dashboardLayout: false});
        },

        getGridPageSizes: function() {
            return [10, 25, 50];
        }
    });
})();