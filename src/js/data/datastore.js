+(function () {
    'use strict';
/**
 * SortType:代表了排序时，数据进行何种转换，由field使用
 */
var SortTypes = Class.create({
    stripTagsRE: /<\/?[^>]+>/gi,
    none: function (s) {
        return s;
    },
    asText: function (s) {
        return String(s).replace(this.stripTagsRE, "");
    },
    asUCText: function (s) {
        return String(s).toUpperCase().replace(this.stripTagsRE, "");
    },
    asUCString: function (s) {
        return String(s).toUpperCase();
    },
    asDate: function (s) {
        if (!s) {
            return 0;
        }
        // if ($.fn.isDate(s)) {
        //     return s.getTime();
        // }
        return Date.parse(String(s));
    },
    asFloat: function (s) {
        var val = parseFloat(String(s).replace(/,/g, ""));
        if (isNaN(val)) val = 0;
        return val;
    },
    asInt: function (s) {
        var val = parseInt(String(s).replace(/,/g, ""));
        if (isNaN(val)) val = 0;
        return val;
    }
});
/**
 * Field代表了一行记录的一列
 */
var Field = Class.create({
    dateFormat: null,
    defaultValue: "",
    mapping: null,
    sortType: null,
    sortDir: "ASC",
    initialize: function (config) {
        if (typeof config == "string") {
            config = {name: config};
        }
        Object.extend(this, config);
        if (!this.type) {
            this.type = "auto";
        }
        var st = SortTypes;
        if (typeof this.sortType == "string") {
            this.sortType = st[this.sortType];
        }
        if (!this.sortType) {
            switch (this.type) {
                case "string":
                    this.sortType = st.asUCString;
                    break;
                case "date":
                    this.sortType = st.asDate;
                    break;
                default:
                    this.sortType = st.none;
            }
        }
        var stripRe = /[\$,%]/g;
        if (!this.convert) {
            var cv, dateFormat = this.dateFormat;
            switch (this.type) {
                case "":
                case "auto":
                case undefined:
                    cv = function (v) {
                        return v;
                    };
                    break;
                case "string":
                    cv = function (v) {
                        return (v === undefined || v === null) ? '' : String(v);
                    };
                    break;
                case "int":
                    cv = function (v) {
                        return v !== undefined && v !== null && v !== '' ?
                            parseInt(String(v).replace(stripRe, ""), 10) : '';
                    };
                    break;
                case "float":
                    cv = function (v) {
                        return v !== undefined && v !== null && v !== '' ?
                            parseFloat(String(v).replace(stripRe, "")) : '';
                    };
                    break;
                case "bool":
                case "boolean":
                    cv = function (v) {
                        return v === true || v === "true" || v == 1;
                    };
                    break;
                case "date":
                    cv = function (v) {
                        if (!v) {
                            return '';
                        }
                        // if (isDate(v)) {
                        //     return v;
                        // }
                        if (dateFormat) {
                            if (dateFormat == "timestamp") {
                                return new Date(v * 1000);
                            }
                            if (dateFormat == "time") {
                                return new Date(parseInt(v, 10));
                            }
                        }
                        var parsed = Date.parse(v);
                        return parsed ? new Date(parsed) : null;
                    };
                    break;
            }
            this.convert = cv;
        }
    }
});



var Record = Class.create({
    dirty: false,
    editing: false,
    error: null,
    modified: null,
    initialize: function (data, id) {
        this.id = (id || id === 0) ? id : ++Record.AUTO_ID;
        this.data = data;
    },    
    join: function (store) {
        this.store = store;
    },
    set: function (name, value) {
        if (String(this.data[name]) == String(value)) {
            return;
        }
        this.dirty = true;
        if (!this.modified) {
            this.modified = {};
        }
        if (typeof this.modified[name] == 'undefined') {
            this.modified[name] = this.data[name];
        }
        this.data[name] = value;
        if (!this.editing && this.store) {
            this.store.afterEdit(this);
        }
    },
    get: function (name) {
        return this.data[name];
    },
    beginEdit: function () {
        this.editing = true;
        this.modified = {};
    },
    cancelEdit: function () {
        this.editing = false;
        delete this.modified;
    },
    endEdit: function () {
        this.editing = false;
        if (this.dirty && this.store) {
            this.store.afterEdit(this);
        }
    },
    reject: function (silent) {
        var m = this.modified;
        for (var n in m) {
            if (typeof m[n] != "function") {
                this.data[n] = m[n];
            }
        }
        this.dirty = false;
        delete this.modified;
        this.editing = false;
        if (this.store && silent !== true) {
            this.store.afterReject(this);
        }
    },
    commit: function (silent) {
        this.dirty = false;
        delete this.modified;
        this.editing = false;
        if (this.store && silent !== true) {
            this.store.afterCommit(this);
        }
    },
    getChanges: function () {
        var m = this.modified, cs = {};
        for (var n in m) {
            if (m.hasOwnProperty(n)) {
                cs[n] = this.data[n];
            }
        }
        return cs;
    },
    hasError: function () {
        return this.error != null;
    },
    clearError: function () {
        this.error = null;
    },
    copy: function (newId) {
        return new this.constructor(Object.extend({}, this.data), newId || this.id);
    },
    isModified: function (fieldName) {
        return this.modified && this.modified.hasOwnProperty(fieldName);
    }
});
Record.AUTO_ID=1000;
Record.EDIT='edit';
Record.REJECT='reject';
Record.COMMIT='commit';
Record.create = function (o) {
    var f = Object.extend(Record, {});
    var p = f.prototype;
    p.fields = new MixedCollection(false, function (field) {
        return field.name;
    });
    for (var i = 0, len = o.length; i < len; i++) {
        p.fields.add(new Field(o[i]));
    }
    p.getField = function (name) {
        return p.fields.get(name);
    };
    return f;
};


var DataStoreManager = Object.extend(new MixedCollection(false), {
    register: function () {
        for (var i = 0, s; s = arguments[i]; i++) {
            this.add(s);
        }
    },
    unregister: function () {
        for (var i = 0, s; s = arguments[i]; i++) {
            this.remove(this.lookup(s));
        }
    },
    lookup: function (id) {
        return typeof id == "object" ? id : this.get(id);
    },
    getKey: function (o) {
        return o.storeId || o.id;
    }
});



var DataStore = Class.create({
    remoteSort: false,
    pruneModifiedRecords: false,
    lastOptions: null,
    initialize: function (config) {
        //console.log("datastore:" + config.storeId + ":initialized");
        this.options = {
            storeId: "",
            geturl: "",
            addurl: "",
            delurl: "",
            updurl: "",
            completed: null,
            rootnode: "root",
            fields: {}
        };
        this.data = new MixedCollection(false);
        this.data.getKey = function (o) {
            return o.id;
        };
        this.baseParams = {};
        this.paramNames = {
            "start": "start",
            "limit": "limit",
            "sort": "sort",
            "dir": "dir"
        };
        if (config) {
            if (config.data) {
                this.inlineData = config.data;
                delete config.data;
            }
            if (config.storeId) {
                this.storeId = config.storeId;
            }
            if (config.url) {
                this.url = config.url;
            }
            if (config.root) {
                this.root = config.root;
            }
            if (config.fields) {
                this.recordType = Record.create(config.fields);
                this.fields = this.recordType.prototype.fields;
            }
            if (config.autoLoad) {
                this.autoLoad = config.autoLoad;
            }
        }
        this.modified = [];
        // this.addEvents(
        //
        //     'datachanged',
        //
        //     'metachange',
        //
        //     'add',
        //
        //     'remove',
        //
        //     'update',
        //
        //     'clear',
        //
        //     'beforeload',
        //
        //     'load',
        //
        //     'loadexception'
        // );
        //
        // if(this.proxy){
        //     this.relayEvents(this.proxy,  ["loadexception"]);
        // }
        this.isloaded = false; //数据是否已经加载
        this.sortToggle = {};
        if (this.sortInfo) {
            this.setDefaultSort(this.sortInfo.field, this.sortInfo.direction);
        }
        if (this.storeId || this.id) {
            DataStoreManager.register(this);
        }
        if (this.inlineData) {
            this.loadData(this.inlineData);
            delete this.inlineData;
            this.isloaded=true;
        } else if (this.autoLoad) {
            //member方法必须先执行bind,否则会出现取到错误this的问题
            this.load.bind(this).defer(config);
        }
    },

    readRecords: function (json) {
        this.jsonData = json;
        var success = false, records = [], totalRecords = 0;
        if (this.jsonData.hasOwnProperty("result")) {
            var v = this.jsonData["result"];
            if (v === "success") {
                success = true;
            }
        }
        if (success === false) {
            //没有返回,或者失败
            if (this.options.completed) {
                this.options.completed(false, result);
            }
        } else {
            var gettotal = this.jsonData["totalProperty"];
            var v = parseInt(gettotal, 10);
            if (!isNaN(v)) {
                totalRecords = v;
            }
            var root = this.jsonData["root"];
            var c = root.length;
            if (c !== totalRecords) {
                success = false;
            } else {
                for (var i = 0; i < c; i++) {
                    var n = root[i];
                    var values = {};
                    var id = n.id;//this.getId(n);
                    for (var j = 0; j < this.fields.length; j++) {
                        var f = this.fields.itemAt(j);
                        var v = n[f.name];
                        values[f.name] = f.convert((v !== undefined) ? v : f.defaultValue, n);
                    }
                    var record = new Record(values, id);
                    record.json = n;
                    records[i] = record;
                }
            }
        }
        return {
            success: success,
            records: records,
            totalRecords: totalRecords
        };
    },
    destroy: function () {
        if (this.id) {
            globalDSM.unregister(this);
        }
        this.data = null;
        //this.purgeListeners();
    },
    add: function (records) {
        records = [].concat(records);
        if (records.length < 1) {
            return;
        }
        for (var i = 0, len = records.length; i < len; i++) {
            records[i].join(this);
        }
        var index = this.data.length;
        this.data.addAll(records);
        if (this.snapshot) {
            this.snapshot.addAll(records);
        }
        // this.fireEvent("add", this, records, index);
    },
    addSorted: function (record) {
        var index = this.findInsertIndex(record);
        this.insert(index, record);
    },
    remove: function (record) {
        var index = this.data.indexOf(record);
        this.data.removeAt(index);
        if (this.pruneModifiedRecords) {
            this.modified.remove(record);
        }
        if (this.snapshot) {
            this.snapshot.remove(record);
        }
        //   this.fireEvent("remove", this, record, index);
    },
    removeAll: function () {
        this.data.clear();
        if (this.snapshot) {
            this.snapshot.clear();
        }
        if (this.pruneModifiedRecords) {
            this.modified = [];
        }
        //  this.fireEvent("clear", this);
    },
    insert: function (index, records) {
        records = [].concat(records);
        for (var i = 0, len = records.length; i < len; i++) {
            this.data.insert(index, records[i]);
            records[i].join(this);
        }
        //  this.fireEvent("add", this, records, index);
    },
    indexOf: function (record) {
        return this.data.indexOf(record);
    },
    indexOfId: function (id) {
        return this.data.indexOfKey(id);
    },
    getById: function (id) {
        return this.data.key(id);
    },
    getAt: function (index) {
        return this.data.itemAt(index);
    },
    getRange: function (start, end) {
        return this.data.getRange(start, end);
    },
    storeOptions: function (o) {
        o = Object.extend({}, o);
        delete o.callback;
        delete o.scope;
        this.lastOptions = o;
    },

    /**
     * json format:
     *    {
     *      metaData:{
     *         total:xxx,
     *         fields:[xxx,xxx]
     *      },
     *      root:{
     *      }
     *    }
     *
     */
    load: function (options) {
        options = options || {};
        var self = this;
        this.data.clear();
        this.isloaded = false;
        var params = Object.extend(options.params || {}, this.baseParams);
        if(this.sortInfo && this.remoteSort){
            var pn = this.paramNames;
            params[pn["sort"]] = this.sortInfo.field;
            params[pn["dir"]] = this.sortInfo.direction;
        }
        this.storeOptions(options);
        var ajax = new Ajax.Request(options.url || self.url, {
            method : 'get',
            parameters : params,
            onSuccess: function(transport) {
                var response = transport.responseText ;
                var status = transport.status;
                //var json = String(data);
                var o = response.evalJSON();
                //console.log("datastore:" + self.storeId + ":read:" + response);
                if (!o) {
                    throw {message: "JsonReader.read: Json object not found"};
                }

                if (o.metaData) {
                    delete self.ef;
                    self.meta = o.metaData;
                    self.recordType = Record.create(o.metaData.fields);
                    //this.onMetaChange(this.meta, this.recordType, o); //not use for meta
                }
                var result = self.readRecords(o);
                self.loadRecords(result, options, result.success);

            },
            onFailure: function() { alert('Something went wrong...'); }
        });
    },
    reload: function (options) {
        this.isloaded = false;
        this.load(Object.extendIf(options || {}, this.lastOptions));
    },
    loadRecords: function (o, options, success) {
        if (!o || success === false) {
            if (success !== false) {
                //    this.fireEvent("load", this, [], options);
            }
            if (options.callback) {
                options.callback.call(options.scope || this, [], options, false);
            }
            return;
        }
        var r = o.records, t = o.totalRecords || r.length;
        if (!options || options.add !== true) {
            if (this.pruneModifiedRecords) {
                this.modified = [];
            }
            for (var i = 0, len = r.length; i < len; i++) {
                r[i].join(this);
            }
            if (this.snapshot) {
                this.data = this.snapshot;
                delete this.snapshot;
            }
            this.data.clear();
            this.data.addAll(r);
            this.totalLength = t;
            this.applySort();
            //  this.fireEvent("datachanged", this);
        } else {
            this.totalLength = Math.max(t, this.data.length + r.length);
            this.add(r);
        }
        //this.fireEvent("load", this, r, options);
        //$.trigger("loaded.datastore", this);
        this.isloaded = true;
        if (options.callback) {
            options.callback.call(options.scope || this, r, options, true);
        }
    },
    loadData: function (o, append) {
        var r = this.readRecords(o);
        this.loadRecords(r, {add: append}, true);
    },
    getCount: function () {
        return this.data.length || 0;
    },
    getTotalCount: function () {
        return this.totalLength || 0;
    },
    getSortState: function () {
        return this.sortInfo;
    },
    applySort: function () {
        if (this.sortInfo && !this.remoteSort) {
            var s = this.sortInfo, f = s.field;
            this.sortData(f, s.direction);
        }
    },
    sortData: function (f, direction) {
        direction = direction || 'ASC';
        var st = this.fields.get(f).sortType;
        var fn = function (r1, r2) {
            var v1 = st(r1.data[f]), v2 = st(r2.data[f]);
            return v1 > v2 ? 1 : (v1 < v2 ? -1 : 0);
        };
        this.data.sort(direction, fn);
        if (this.snapshot && this.snapshot != this.data) {
            this.snapshot.sort(direction, fn);
        }
    },
    setDefaultSort: function (field, dir) {
        dir = dir ? dir.toUpperCase() : "ASC";
        this.sortInfo = {field: field, direction: dir};
        this.sortToggle[field] = dir;
    },
    sort: function (fieldName, dir) {
        var f = this.fields.get(fieldName);
        if (!f) {
            return false;
        }
        if (!dir) {
            if (this.sortInfo && this.sortInfo.field == f.name) {
                dir = (this.sortToggle[f.name] || "ASC").toggle("ASC", "DESC");
            } else {
                dir = f.sortDir;
            }
        }
        var st = (this.sortToggle) ? this.sortToggle[f.name] : null;
        var si = (this.sortInfo) ? this.sortInfo : null;
        this.sortToggle[f.name] = dir;
        this.sortInfo = {field: f.name, direction: dir};
        if (!this.remoteSort) {
            this.applySort();
            //  this.fireEvent("datachanged", this);
        } else {
            if (!this.load(this.lastOptions)) {
                if (st) {
                    this.sortToggle[f.name] = st;
                }
                if (si) {
                    this.sortInfo = si;
                }
            }
        }
    },
    each: function (fn, scope) {
        this.data.each(fn, scope);
    },
    getModifiedRecords: function () {
        return this.modified;
    },
    createFilterFn: function (property, value, anyMatch, caseSensitive) {
        if (isEmpty(value, false)) {
            return false;
        }
        value = this.data.createValueMatcher(value, anyMatch, caseSensitive);
        return function (r) {
            return value.test(r.data[property]);
        };
    },
    sum: function (property, start, end) {
        var rs = this.data.items, v = 0;
        start = start || 0;
        end = (end || end === 0) ? end : rs.length - 1;
        for (var i = start; i <= end; i++) {
            v += (rs[i].data[property] || 0);
        }
        return v;
    },
    filter: function (property, value, anyMatch, caseSensitive) {
        var fn = this.createFilterFn(property, value, anyMatch, caseSensitive);
        return fn ? this.filterBy(fn) : this.clearFilter();
    },
    filterBy: function (fn, scope) {
        this.snapshot = this.snapshot || this.data;
        this.data = this.queryBy(fn, scope || this);
        //   this.fireEvent("datachanged", this);
    },
    query: function (property, value, anyMatch, caseSensitive) {
        var fn = this.createFilterFn(property, value, anyMatch, caseSensitive);
        return fn ? this.queryBy(fn) : this.data.clone();
    },
    queryBy: function (fn, scope) {
        var data = this.snapshot || this.data;
        return data.filterBy(fn, scope || this);
    },
    find: function (property, value, start, anyMatch, caseSensitive) {
        var fn = this.createFilterFn(property, value, anyMatch, caseSensitive);
        return fn ? this.data.findIndexBy(fn, null, start) : -1;
    },
    findBy: function (fn, scope, start) {
        return this.data.findIndexBy(fn, scope, start);
    },
    collect: function (dataIndex, allowNull, bypassFilter) {
        var d = (bypassFilter === true && this.snapshot) ?
            this.snapshot.items : this.data.items;
        var v, sv, r = [], l = {};
        for (var i = 0, len = d.length; i < len; i++) {
            v = d[i].data[dataIndex];
            sv = String(v);
            if ((allowNull || !isEmpty(v)) && !l[sv]) {
                l[sv] = true;
                r[r.length] = v;
            }
        }
        return r;
    },
    clearFilter: function (suppressEvent) {
        if (this.isFiltered()) {
            this.data = this.snapshot;
            delete this.snapshot;
            if (suppressEvent !== true) {
                //      this.fireEvent("datachanged", this);
            }
        }
    },
    isFiltered: function () {
        return this.snapshot && this.snapshot != this.data;
    },
    afterEdit: function (record) {
        if (this.modified.indexOf(record) == -1) {
            this.modified.push(record);
        }
        //this.fireEvent("update", this, record, data.Record.EDIT);
    },
    afterReject: function (record) {
        this.modified.remove(record);
        // this.fireEvent("update", this, record, data.Record.REJECT);
    },
    afterCommit: function (record) {
        this.modified.remove(record);
        //this.fireEvent("update", this, record, data.Record.COMMIT);
    },
    commitChanges: function () {
        var m = this.modified.slice(0);
        this.modified = [];
        for (var i = 0, len = m.length; i < len; i++) {
            m[i].commit();
        }
    },
    rejectChanges: function () {
        var m = this.modified.slice(0);
        this.modified = [];
        for (var i = 0, len = m.length; i < len; i++) {
            m[i].reject();
        }
    },
    onMetaChange: function (meta, rtype, o) {
        this.recordType = rtype;
        this.fields = rtype.prototype.fields;
        delete this.snapshot;
        this.sortInfo = meta.sortInfo;
        this.modified = [];
        //this.fireEvent('metachange', this, this.reader.meta);
    },
    findInsertIndex: function (record) {
        //this.suspendEvents();
        var data = this.data.clone();
        this.data.add(record);
        this.applySort();
        var index = this.data.indexOf(record);
        this.data = data;
        // this.resumeEvents();
        return index;
    }
});



var SimpleDataStore = Class.create(DataStore, {
    initialize: function ($super,config) {
      $super(config);
    },
    readRecords: function (arr) {
        var sid = this.meta ? this.meta.id : null;
        var recordType = this.recordType, fields = recordType.prototype.fields;
        var records = [];
        var root = arr;
        for (var i = 0; i < root.length; i++) {
            var n = root[i];
            var values = {};
            var id = ((sid || sid === 0) && n[sid] !== undefined && n[sid] !== "" ? n[sid] : null);
            for (var j = 0, jlen = fields.length; j < jlen; j++) {
                var f = fields.items[j];
                var k = f.mapping !== undefined && f.mapping !== null ? f.mapping : j;
                var v = n[k] !== undefined ? n[k] : f.defaultValue;
                v = f.convert(v, n);
                values[f.name] = v;
            }
            var record = new recordType(values, id);
            record.json = n;
            records[records.length] = record;
        }
        return {
            records: records,
            totalRecords: records.length
        };
    },
});



var getDataStore = function (self, name, args) {
    var func = name;

    if (typeof name === 'string') {
        // support obj.func1.func2
        func = window[name];
    }
    if (typeof func === 'object') {
        return func;
    }
    if (typeof func === 'function') {
        return func.apply(self, args);
    }
    if (!func && typeof name === 'string') {
        return DataStoreManager.lookup(name);
    }
};

Object.extend(ju, {
    getDataStore:getDataStore,
    SimpleDataStore:SimpleDataStore,
    DataStore:DataStore,
    DataStoreManager:DataStoreManager,
    Record:Record,
    Field:Field
});

})();