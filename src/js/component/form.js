/**
 *
 * Created by Administrator on 2016/5/25 0025.
 */

(function ($) {
    'use strict';
    $.fn.extend({
        getFormElements: function () {
            return this.map(function () {
                // Can add propHook for "elements" to filter or add form elements
                var elements = $.prop(this, "elements");
                return elements ? $.makeArray(elements) : this;
            }).filter(function () {
                var rcheckableType = ( /^(?:checkbox|radio)$/i ),
                    rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
                    rsubmittable = /^(?:input|select|textarea|keygen)/i,
                    rhiddenType = /^(?:hidden)/i;
                var type = this.type;
                // Use .is(":disabled") so that fieldset[disabled] works
                return this.name && !$(this).is(":disabled") &&
                    rsubmittable.test(this.nodeName) && !rsubmitterTypes.test(type) &&
                    ( this.checked || !rcheckableType.test(type) ) && !rhiddenType.test(type);
            });
        }
    });

    var Action = Class.create({
        type: 'default',
        initialize: function (form, options) {
            this.form = form;
            this.options = options || {};
        },
        run: function (options) {
        },
        success: function (response) {
        },
        handleResponse: function (response) {
        },
        failure: function (response) {
            this.response = response;
            this.failureType = Action.CONNECT_FAILURE;
            this.form.afterAction(this, false);
        },
        processResponse: function (response) {
            this.response = response;
            if (!response.responseText) {
                return true;
            }
            this.result = this.handleResponse(response);
            return this.result;
        },
        getMethod: function () {
            return (this.options.method || this.form.method || this.form.$element.attr('method') || 'POST').toUpperCase();
        },
        getActionURL: function () {
            return this.options.url || this.form.actionurl || this.form.$element.attr('action');
        },
        createCallback: function (opts) {
            var opts = opts || {};
            return {
                onSuccess: this.success,
                onFailure: this.failure,
                scope: this,
                timeout: (opts.timeout * 1000) || (this.form.timeout * 1000),
                upload: this.form.fileUpload ? this.success : undefined
            };
        }
    });
    Action.CLIENT_INVALID = 'client';
    Action.SERVER_INVALID = 'server';
    Action.CONNECT_FAILURE = 'connect';
    Action.LOAD_FAILURE = 'load';
    Action.Submit = Class.create(Action, {
        type: 'submit',
        run: function () {
            var o = this.options;
            var method = this.getMethod();
            var isPost = method == 'POST';
            if (this.form.isValid()) {
                var ajax = new Ajax.Request(this.getActionURL(),
                    Object.extend(this.createCallback(o), {
                        form: this.form.$element,
                        method: method,
                        parameters: isPost ? this.options.params : null,
                        isUpload: this.form.fileUpload
                    })
                );
            }
        },
        success: function (response) {
            var result = this.processResponse(response);
            if (result === true || result.success) {
                this.form.afterAction(this, true);
                return;
            }
            if (result.errors) {
                this.form.markInvalid(result.errors);
                this.failureType = Action.SERVER_INVALID;
            }
            this.form.afterAction(this, false);
        },
        handleResponse: function (response) {
            if (this.form.errorReader) {
                var rs = this.form.errorReader.read(response);
                var errors = [];
                if (rs.records) {
                    for (var i = 0, len = rs.records.length; i < len; i++) {
                        var r = rs.records[i];
                        errors[i] = r.data;
                    }
                }
                if (errors.length < 1) {
                    errors = null;
                }
                return {
                    success: rs.success,
                    errors: errors
                };
            }
            return decode(response.responseText);
        }
    });
    Action.Load = Class.create(Action, {
        type: 'load',
        run: function () {
            var ajax = new Ajax.Request(this.getActionURL(),
                Object.extend(this.createCallback(this.options), {
                    method: this.getMethod(),
                    parameters: this.options.params
                })
            );
        },
        success: function (response) {
            var result = this.processResponse(response);
            if (result === true || !result.success || !result.data) {
                this.failureType = Action.LOAD_FAILURE;
                this.form.afterAction(this, false);
            } else {
                this.form.clearInvalid();
                this.form.setValues(result.data);
            }
            this.form.afterAction(this, true);
        },
        handleResponse: function (response) {
            if (this.form.reader) {
                var rs = this.form.reader.read(response);
                var data = rs.records && rs.records[0] ? rs.records[0].data : null;
                return {
                    success: rs.success,
                    data: data
                };
            }
            return decode(response.responseText);
        }
    });
    Action.ACTION_TYPES = {
        'load': Action.Load,
        'submit': Action.Submit
    };

    var Validator = Class.create({
        initialize: function (method, rules, messages) {
            this.method = method; //校验方法
            this.rules = rules; //规则
            this.messages = messages; //消息
            this.transformer = null; //校验前是否进行值转换
        },
        validate: function (value, context) {
            if (this.transformer) {
                value = this.transformer.apply(context || this, value);
            }
            return Validator.methods[this.method].apply(this, value, context);
        }
    });
    Validator.Required = Class.create({
        validate: function (value, context) {
            if (Object.isEmpty(value)) {
                return false;
            }
            return true;
        }
    });

    var Element = Class.create({
        initialize: function (element) {
            this.id = element.id;
            this.element = element;
            this.$element = $('#' + this.id);
            this.name = element.name;
            this.originValue = this.getValue();
            this.tagName = element.tagName;
            this.modified = false; //数据是否修改
            this.value = this.originValue;
            this.validators = this.parseOptions();
        },
        isValid: function () {
            var value = this.getValue();
            var valid = true;
            //TODO:do validate
            // this.validators.each(function (validator) {
            //     if (!validator.validate(value)) {
            //         valid = false;
            //         throw $break;
            //     }
            // });
            return valid;
        },
        isDirty: function () {
            return this.modified;
        },
        reset: function () {
            this.setValue(this.originValue);
        },
        getValue: function () {
            return this.$element.val();
        },
        setValue: function (value) {
            var origin = this.getValue();
            this.$element.val(value);
            if (this.originValue != value) {
                this.modified = true;
            }
            return origin;
        },
        disable: function () {
            this.$element.disable();
        },
        enable: function () {
            this.$element.enable();
        },
        parseOptions: function () {

        }
    });

    var Form = Class.create({
        initialize: function (element, options, e) {
            // if (e) {
            //     e.stopPropagation();
            //     e.preventDefault();
            // }

            this.$element = $(element);
            //Expose public methods
            //this.loadStore = Form.prototype.loadStore;
            this.elements = new ju.MixedCollection(false);
            this.standardSubmit = false;

            this.init();
        },
        getDefaults: function () {
            return Form.DEFAULTS;
        },
        getOptions: function (options) {
            options = $.extend({}, this.getDefaults(), this.$element.data(), options);
            return options;
        },
        //初始化
        init: function () {
            this.options = this.getOptions();
            this.method = this.$element.attr('method');
            this.actionurl = this.$element.attr('action');
            var x = this.$element.getFormElements();
            var that = this;
            $.each(x, function (i, element) {
                //console.log(element.name + ":" + element.value + " " + element.type);
                that.elements.add(element.name, new Element(element));
            });
        },
        //加载数据
        loadRecord: function (record) {
            this.clear();
            this.record = record;
            this.setValues(record.data);
            return this;

        },
        //更新记录
        updateRecord: function (record) {
            record.beginEdit();
            var fs = record.fields;
            fs.each(function (f) {
                var field = this.findField(f.name);
                if (field) {
                    record.set(f.name, field.getValue());
                }
            }, this);
            record.endEdit();
            return this;
        },
        //清空数据
        clear: function () {
            this.elements.each(function (element) {
                element.setValue('');
            });
        },
        //提交表单
        submit: function (options) {
            var v = this.isValid();
            if (v) {
                if (this.standardSubmit) {
                    this.$element.submit();
                }
                this.doAction('submit', options);
            }
            return v;
        },
        //数据是否有修改
        isDirty: function () {
            var dirty = false;
            this.elements.each(function (element) {
                if (element.isDirty()) {
                    dirty = true;
                    throw $break;
                }
            });
            return dirty;
        },
        //校验数据
        isValid: function () {
            var valid = true;
            var invalidField = null;
            this.elements.each(function (element) {
                if (!element.isValid()) {
                    valid = false;
                    invalidField = element;
                    throw $break;
                }
            });
            return valid;
        },
        doAction: function (action, options) {
            if (typeof action == 'string') {
                action = new Action.ACTION_TYPES[action](this, options);
            }

            this.beforeAction(action);
            action.run.bind(action).defer();
            return this;
        },
        load: function (options) {
            this.doAction('load', options);
            return this;
        },
        //提交或者加载之前的动作
        beforeAction: function (action) {

        },
        //执行action之后的动作
        afterAction: function (action, success) {

        },
        /**
         * 将表单数据转成JSON对象 用法：$(form).serializeJson() Author: K'naan
         */
        serializeJson: function () {
            var o = {};
            var a = this.$element.serializeArray();

            $.each(a, function () {
                if (o[this.name] !== undefined) {
                    if (!o[this.name].push) {
                        o[this.name] = [o[this.name]]
                    }
                    o[this.name].push(this.value || '')
                } else {
                    o[this.name] = this.value || ''
                }
            });

            return o;
        }
    });

    Form.VERSION = '1.0.0';

    // part of this is duplicated in i18n/defaults-en_US.js. Make sure to update both.
    Form.DEFAULTS = {
        elements: {}, //所有项
        record: null, //数据模型
        method: 'get', //提交类型
        action: '' //提交地址
    };

    // Form PLUGIN DEFINITION
    // ==============================
    function Plugin(option, event) {
        // get the args of the outer function..
        var args = arguments;
        // The arguments of the function are explicitly re-defined from the argument list, because the shift causes them
        // to get lost/corrupted in android 2.3 and IE9 #715 #775
        var _option = option,
            _event = event;
        [].shift.apply(args);

        var value;
        var chain = this.each(function () {
            var $this = $(this);
            if ($this.is('form')) {
                var data = $this.data('bs.form'),
                    options = typeof _option == 'object' && _option;

                if (!data) {
                    $this.data('bs.form', (data = new Form(this, options, _event)));
                } else if (options) {
                    for (var i in options) {
                        if (options.hasOwnProperty(i)) {
                            data.options[i] = options[i];
                        }
                    }
                }

                if (typeof _option == 'string') {
                    if (data[_option] instanceof Function) {
                        value = data[_option].apply(data, args);
                    } else {
                        value = data.options[_option];
                    }
                }
            }
        });

        if (typeof value !== 'undefined') {
            //noinspection JSUnusedAssignment
            return value;
        } else {
            return chain;
        }
    }


    var old = $.fn.form;
    $.fn.form = Plugin;
    $.fn.form.Constructor = Form;

    // Form NO CONFLICT
    // ========================
    $.fn.form.noConflict = function () {
        $.fn.form = old;
        return this;
    };

    // Form DATA-API
    // =====================
})(jQuery);
