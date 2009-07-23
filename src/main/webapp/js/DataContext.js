/*
Copyright 2009 University of Toronto

Licensed under the Educational Community License (ECL), Version 2.0. 
ou may not use this file except in compliance with this License.

You may obtain a copy of the ECL 2.0 License at
https://source.collectionspace.org/collection-space/LICENSE.txt
*/

/*global jQuery, fluid_1_1*/

var cspace = cspace || {};

(function ($, fluid) {
    
    fluid.completelyIndirectStringTemplate = function (template, values, model) {
        var newString = template;
        var hasModel = !!model;
        for (var key in values) {
            if (values.hasOwnProperty(key)) {
                var searchStr = "%" + key;
                var value = hasModel ? fluid.getBeanValue(model, values[searchStr]) : values[key];
                newString = newString.replace(searchStr, value);
            }
        }
        return newString;
    };
    
    var bindEventHandlers = function (that) {
        that.events.afterFetch.addListener(function (modelPath, data) {
            that.updateModel(data);
        });
    };

    // This isn't currently used, but might be useful in fuzzing over slashes.
    var addTrailingSlash = function (url) {
        return url + (url.chatAt(length - 1) !== "/") ? "/" : "";
    };
    
    /**
     * The Data Context, an object that provides generic CRUD operations for models.
     * 
     * @param {Object} model the model that is bound to this data context
     * @param {Object} options configuration options
     */
    cspace.dataContext = function (model, options) {
        var that = {
            model: model
        };
        fluid.mergeComponentOptions(that, "fluid.dataContext", options);
        that.urlFactory = fluid.initSubcomponent(that, "urlFactory", [fluid.COMPONENT_OPTIONS]);
        fluid.instantiateFirers(that, that.options);
        
        that.updateModel = function (newModel, source) {
            var oldModel;
            fluid.clear(that.model);
            fluid.model.copyModel(that.model, newModel);
            that.events.modelChanged.fire(that.model, oldModel, source);
        };
        
        that.fetch = function (modelPath, queryParameters) {
            var shadow = {};
            if (modelPath === "*") {
                shadow = queryParameters;
            } else {
                fluid.model.setBeanValue(shadow, modelPath, queryParameters);
            }
            var workingModel = $.extend({}, that.model, shadow);
            jQuery.ajax({
                url: that.urlFactory.urlForModelPath(modelPath, workingModel),
                type: "GET",
                dataType: that.urlFactory.options.dataType,
                success: function (data, textStatus) {
                    that.events.afterFetch.fire(modelPath, data);
                },
                error: function (xhr, textStatus, errorThrown) {
                    that.events.onError.fire("fetch", modelPath, textStatus);
                }
            });
        };
        
        that.create = function (modelPath) {
            
        };
        
        that.update = function (modelPath) {
            
        };

        // creates or updates as necessary
        that.save = function (modelPath)  {
            
        };
            
        that.remove = function (modelPath) {
            
        };
        
        bindEventHandlers(that);
        return that;
    };
    
    fluid.defaults("fluid.dataContext", {
        events: {
            modelChanged: null,    // newModel, oldModel, source
            afterSave: null,   // modelPath, oldData, newData
            afterDelete: null, // modelPath
            afterFetch: null,  // modelPath, data
            onError: null      // operation["save", "delete", "fetch"], modelPath, message
        },
        urlFactory: {
            type: "cspace.dataContext.urlFactory"
        }
    });
    
    /**
     * A convenience function for creating a dataContext that uses the resourceMapper version of the
     * urlFactory.
     */
    cspace.resourceMapperDataContext = function (model, options) {
        var opts = {};
        // /TODO: Implement this function!
        return cspace.dataContext(model, opts);        
    };
    
    /**
     * A UrlFactory is responsible for hiding away the variations between loading data locally for testing
     * and on the server in production
     * 
     * @param {Object} options configuration options for the url factory
     */
    cspace.dataContext.urlFactory = function (options) {
        var that = {};
        fluid.mergeComponentOptions(that, "cspace.dataContext.urlFactory", options);
        // TODO: The resourceMapper should probably not be nested so deeply
        that.resourceMapper = fluid.initSubcomponent(that, "resourceMapper", [fluid.COMPONENT_OPTIONS]);
        
        var extension = function () {
            // TODO: This should be generalized to something more sensible. Or should we have the user specifically provide the extension?
            return that.options.includeResourceExtension ? "." + that.options.dataType : "";
        };
        
        that.urlForModelPath = function (modelPath, model) {
            var resource = that.resourceMapper.map(model, modelPath);
            return that.options.protocol + that.options.baseUrl + resource + extension();
        };
        
        return that;    
    };
    
    fluid.defaults("cspace.dataContext.urlFactory", {
        resourceMapper: {
            type: "cspace.dataContext.staticResourceMapper"
        },
        protocol: (document.location.protocol === "file:") ? "file://" : "http://",
        baseUrl: "/",
        dataType: "json",
        includeResourceExtension: false
    });
    
    /**
     * The StaticResourceMapper is the default strategy for mapping model paths to resource-oriented URLs.
     * 
     * @param {Object} options configuration options for the mapper, including the modelToResourceMap
     */
    cspace.dataContext.staticResourceMapper = function (options) {
        var that = {
            modelToResourceMap: (options && options.modelToResourceMap) ? options.modelToResourceMap : {},
            replacements: (options && options.replacements) ? options.replacements : {}
        };

        
        that.map = function (model, modelPath) {
            if (!modelPath) {
                modelPath = "*";
            }
            
            var result = "";
            if (!that.modelToResourceMap.hasOwnProperty(modelPath)) {
                // TODO: what to return if there's no map??
                return result;
            }

            // TODO: this is pretty inefficient; resolving the values of each key in the replacements, even if we only need a few of them.
            var reps = [];
            for (var key in that.replacements) {
                if (that.replacements.hasOwnProperty(key)) {
                    reps[key] = fluid.model.getBeanValue(model, that.replacements[key]);
                }
            }
            result = fluid.stringTemplate(that.modelToResourceMap[modelPath], reps);

            return result;
        };
        
        return that;
    };
})(jQuery, fluid_1_1);