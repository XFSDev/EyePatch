var debug = false;

ep.body = $('body');
ep.tabs  = {};
ep.pages  = {};
ep.widgets = {};
ep.urls = {};
ep.dom = {};
ep.forms = {};
ep.widgetTypes = {};

ep.dragHolder = ko.observable(undefined);

ep.templateList = [];

var logger = function (log) {
    if (typeof debug !== 'undefined') {
        $('<div></div>').appendTo('#log').text(new Date().toGMTString() + ' : eyepatch-admin-panel.js - ' + log);
    }
};

var evalProperties = function(object) {
    for (var propertyName in object) {
        var value = object[propertyName];
        if (propertyName.indexOf('~') === 0) {
            var newName = propertyName.substring(1);
            var propValue = eval(value);
            object[newName] = propValue;
        }
        if (typeof value === "object") {
            evalProperties(value);
        }
    }
    return object;
};

ep.postJson = function (url, data, onSuccess, onError) {
    $.ajax({
        url: url,
        data: JSON.stringify(data),
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        success: function (data) {
            if (data.success) {
                onSuccess(data);
            }
        },
        error: function () {
            if (onError) {
                onError();
            }
        }
    });
};

String.prototype.format = function () {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{' + i + '\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};

(function () {
    ep.forms = {
        errorPlacement: function (error, inputElement) {
            var container = inputElement.closest('form').find("[data-valmsg-for='" + inputElement[0].name + "']"),
                replace = $.parseJSON(container.attr("data-valmsg-replace")) !== false, text = error.text();

            container.removeClass("field-validation-valid").addClass("field-validation-error");
            error.data("unobtrusiveContainer", container);

            if (replace) {
                container.empty();
                error.attr('title', text).empty().removeClass("input-validation-error").appendTo(container).tipTip({ defaultPosition: 'right' });
            }
            else {
                error.hide();
            }
        },
        parse: function (form) {
            var $form = $(form);
            $.validator.unobtrusive.parse($form);
            $form.data('validator').settings.errorPlacement = ep.forms.errorPlacement;
            return $form;
        }
    };

    ko.bindingHandlers.prepareForm = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var $form = $(element);
            if (typeof valueAccessor() != "function")
                throw new Error("The value for a submit binding must be a function to invoke on submit");

            $('.help', $form).tipTip();

            $form.ajaxForm({
                type: 'POST',
                beforeSubmit: function (arr, $form, options) {
                    return ep.forms.parse($form).valid();
                },
                success: function (responseText, statusText, xhr, form) {
                    if (responseText.success) {
                        var value = valueAccessor();
                        value.call(viewModel, element, responseText);
                    } else {
                        $.noticeAdd({ text: responseText.message || "An error occurred", stay: false, type: 'error' });
                    }
                }
            });
        }
    };
} ());
/*global document, window, $, ko, debug, setTimeout, alert */
(function () {
    // Private function
    var templateEngine = new ko.jqueryTmplTemplateEngine();

    ko.infoPanel = {
        viewModel: function (configuration) {
            this.data = configuration.data || {};
            this.urls = configuration.urls || {};
            this.types = configuration.types;

            this.loading = ko.observable(false);
            this.defaultTemplate = ko.observable(configuration.defaultTemplate);
            this.displayType = ko.observable(configuration.displayType);

            this.templateToRender = function () {
                var type = this.displayType();
                if (type === undefined) {
                    return this.defaultTemplate();
                }
                var typeTemplate = this.types[type].template;
                return typeTemplate || type + 'InfoTemplate';
            } .bind(this);

            this.dataToDisplay = ko.dependentObservable(function () {
                var type = this.displayType();
                var result = this.types[type] || {};
                result.data = this.data;
                result.urls = this.urls;
                return result;
            }, this);

            this.mapData = function (data, type) {
                if (this.types[type].mapped) {
                    ko.mapping.updateFromJS(this.types[type], data);
                } else {
                    ko.mapping.fromJS(data, {}, this.types[type]);
                }
                var obj = this.types[type];
                this.types[type].mapped = true;
            };

            this.display = function (node) {
                var type = node.type();

                if (this.types[type].ajax) {
                    this.loading(true);
                    var that = this;
                    ep.postJson(this.urls[type].info, { id: node.id() }, function (result) {
                        that.mapData(result.data, type);
                        that.displayType(type);
                        that.loading(false);
                    });
                } else {
                    this.loading(false);
                    this.displayType(type);
                }
            };
        }
    };

    ko.addTemplateSafe("pageInfoTemplate", "<div class=\"page-info form\">\
                                <form method=\"post\" action=\"${ urls.page.update }\" data-bind=\"prepareForm: success\">\
                                    <input name=\"Id\" type=\"hidden\" data-bind=\"value : id\" />\
                                    <div class=\"field\">\
                                        <label for=\"epTitle\">Title <span class=\"help\" title=\"The page title appears in the broswer tab, search results & when added to favorites. <br/><br/>Note: This is not the same as the name of the page in the tree which is purely for your reference.\"></span></label>\
                                        <input id=\"epTitle\" name=\"Title\" type=\"text\" data-bind=\"value : title\" data-val=\"true\" data-val-required=\"A page title is required\"/>\
                                        <span data-valmsg-replace=\"true\" data-valmsg-for=\"Title\" class=\"field-validation-valid\"></span>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epUrl\">Url <span class=\"help\" title=\"The relative url at which your page can be reached. e.g. /my-new-page\"></span></label>\
                                        <input id=\"epUrl\" name=\"UrlInput\" type=\"text\" data-bind=\"value : url, disable: !urlEditable()\" data-val=\"true\" data-val-required=\"A url must be supplied\"/>\
                                        <input name=\"Url\" type=\"hidden\" data-bind=\"value : url\"/>\
                                        <span data-valmsg-replace=\"true\" data-valmsg-for=\"Url\" class=\"field-validation-valid\"></span>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epTemplate\">Template <span class=\"help\" title=\"The template the page will use.\"></span></label>\
                                        <select id=\"epTemplate\" name=\"TemplateID\" data-bind=\"options: data.templates, optionsText: 'Value', optionsValue: 'Key', value: templateID\"></select>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epIsLive\">Is Page Live <span class=\"help\" title=\"Until this checkbox is checked the page will only be visible to you and will not be accessible to the outside world.\"></span></label>\
                                        <input id=\"epIsLive\" name=\"IsLive\" type=\"checkbox\" data-bind=\"checked : isLive\" value=\"true\" />\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epIsInMenu\">Show in menu <span class=\"help\" title=\"Should the page be shown in the menu.\"></span></label>\
                                        <input id=\"epIsInMenu\" name=\"IsInMenu\" type=\"checkbox\" data-bind=\"checked : isInMenu\" value=\"true\" />\
                                    </div>\
                                    <div class=\"field\" data-bind=\"visiable: isInMenu\">\
                                        <label for=\"epIsInMenu\">Menu order <span class=\"help\" title=\"If showing in the menu this field denotes the order of appearance.\"></span></label>\
                                        <input id=\"epMenuOrder\" name=\"MenuOrder\" type=\"text\" data-bind=\"value : menuOrder\" />\
                                    </div>\
                                    <br/><br/>\
                                    <div class=\"center help-text\">Double click a page in the tree to navigate to that page.</div>\
                                    <div class=\"button-container\">\
                                        <button type=\"submit\" title=\"Click here to save this page\">\
                                            Save</button>\
                                    </div>\
                                </form>\
                            </div>", templateEngine);

    ko.addTemplateSafe("templateInfoTemplate", "<div class=\"page-info form\">\
                                <div class=\"center help-text\">Templates in EyePatch provide the layout for your pages. Meta data can be set on the Search & Facebook child nodes. This provides a default value which can be overridden by each page that uses the template.</div>\
                                <form method=\"post\" action=\"${ urls.template.update }\" data-bind=\"prepareForm: success\">\
                                    <input name=\"Id\" type=\"hidden\" data-bind=\"value : id\" />\
                                    <div class=\"field\">\
                                        <label for=\"epAnalytics\">Google Analytics <span class=\"help\" title=\"The google analytics web property ID e.g. UA-XXXXX-X. This is used to track the website, visit http://www.google.com/analytics/ for more info.\"></span></label>\
                                        <input id=\"epAnalytics\" name=\"AnalyticsKey\" type=\"text\" data-bind=\"value : analyticsKey\"/>\
                                    </div>\
                                    <div class=\"button-container\">\
                                        <button type=\"submit\" title=\"Click here to save this template\">\
                                            Save</button>\
                                    </div>\
                                </form>\
                            </div>", templateEngine);

    ko.addTemplateSafe("searchInfoTemplate", "<div class=\"page-info form\">\
                                <form method=\"post\" action=\"${ urls.search.update }\" data-bind=\"prepareForm: success\">\
                                    <input name=\"Id\" type=\"hidden\" data-bind=\"value : id\" />\
                                    <div class=\"field\">\
                                        <label for=\"epDescription\">Description <span class=\"help\" title=\"The text can be used when printing a summary of the document. The text should not contain any formatting information. Used by some search engines to describe your document.\"></span></label>\
                                        <textarea id=\"epTmplDescription\" name=\"Description\" data-bind=\"value : description, attr: { placeholder: def.description() }\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epKeywords\">Keywords <span class=\"help\" title=\"Comma separated keywords are used by some search engines to index your document in addition to words from the title and document body. Typically used for synonyms and alternates of title words. Consider adding frequent misspellings. e.g. heirarchy, hierarchy.\"></span></label>\
                                        <input id=\"epTmplKeywords\" name=\"Keywords\" type=\"text\" data-bind=\"value : keywords, attr: { placeholder: def.keywords() }\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epLanguage\">Language <span class=\"help\" title=\"Declares the primary natural language(s) of the document. May be used by search engines to categorize by language.\"></span></label>\
                                        <select id=\"epLanguage\" name=\"Language\" data-bind=\"options: languages, optionsText: 'Value', optionsValue: 'Key', value: language, optionsCaption: 'Choose...'\"></select>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epCharset\">Charset <span class=\"help\" title=\"It is recommended to always use this tag and to specify the charset.\"></span></label>\
                                        <select id=\"eplCharset\" name=\"Charset\" data-bind=\"options: charsets, optionsText: 'Value', optionsValue: 'Key', value: charset\"></select>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epAuthor\">Author <span class=\"help\" title=\"The author's name.\"></span></label>\
                                        <input id=\"epAuthor\" name=\"Author\" type=\"text\" data-bind=\"value : author, attr: { placeholder: def.author() }\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epCopyright\">Copyright <span class=\"help\" title=\"The copyright owner.\"></span></label>\
                                        <input id=\"epCopyright\" name=\"Copyright\" type=\"text\" data-bind=\"value : copyright, attr: { placeholder: def.copyright() }\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epRobots\">Robots <span class=\"help\" title=\"A comma separate list of any of the following, <br/>INDEX: search engine robots should include this page. FOLLOW: robots should follow links from this page to other pages. <br/>NOINDEX: links can be explored, although the page is not indexed. <br/>NOFOLLOW: the page can be indexed, but no links are explored. <br/>NONE: robots can ignore the page. <br/>NOARCHIVE: Google uses this to prevent archiving of the page.\"></span></label>\
                                        <input id=\"epRobots\" name=\"Robots\" type=\"text\" data-bind=\"value : robots, attr: { placeholder: def.robots() }\"/>\
                                    </div>\
                                    <div class=\"button-container\">\
                                        <button type=\"submit\" title=\"Click here to save this page\">\
                                            Save</button>\
                                    </div>\
                                </form>\
                            </div>", templateEngine);

    ko.addTemplateSafe("facebookInfoTemplate", "<div class=\"page-info form\">\
                                <form method=\"post\" action=\"${ urls.facebook.update }\" data-bind=\"prepareForm: success\">\
                                    <input name=\"Id\" type=\"hidden\" data-bind=\"value : id\" />\
                                    <div class=\"field\">\
                                        <label for=\"epType\">Type <span class=\"help\" title=\"The type of your object (most common is article).\"></span></label>\
                                        <select id=\"epType\" name=\"Type\" data-bind=\"options: types, optionsText: 'Value', optionsValue: 'Key', value: type, optionsCaption: 'Choose...'\"></select>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epEmail\">Email <span class=\"help\" title=\"Contact email associated with the object.\"></span></label>\
                                        <input id=\"epEmail\" name=\"Email\" type=\"text\" data-bind=\"value : email, attr: { placeholder: def.email() }\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epPhone\">Phone <span class=\"help\" title=\"Contact phone number associated with the object.\"></span></label>\
                                        <input id=\"epPhone\" name=\"Phone\" type=\"text\" data-bind=\"value : phone, attr: { placeholder: def.phone() }\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epImage\">Image <span class=\"help\" title=\"An image URL which should represent your object within the graph. The image must be at least 50px by 50px and have a maximum aspect ratio of 3:1. We support PNG, JPEG and GIF formats. You may include multiple og:image tags to associate multiple images with your page.\"></span></label>\
                                        <input id=\"epImage\" name=\"Image\" type=\"text\" data-bind=\"value : image, attr: { placeholder: def.image() }\"/>\
                                    </div>\
                                        <div class=\"field\">\
                                        <label for=\"epAddress\">Street Address <span class=\"help\" title=\"A street address for the entity to be contacted at.\"></span></label>\
                                        <input id=\"epAddress\" name=\"StreetAddress\" type=\"text\" data-bind=\"value : streetAddress, attr: { placeholder: def.streetAddress() }\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epLocality\">Locality <span class=\"help\" title=\"The entity's locality. e.g. Palo Alto\"></span></label>\
                                        <input id=\"epLocality\" name=\"Locality\" type=\"text\" data-bind=\"value : locality, attr: { placeholder: def.locality() }\"/>\
                                    </div>\
                                        <div class=\"field\">\
                                        <label for=\"epRegion\">Region <span class=\"help\" title=\"The entity's region.\"></span></label>\
                                        <input id=\"epRegion\" name=\"Region\" type=\"text\" data-bind=\"value : region, attr: { placeholder: def.region() }\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epCountry\">Country <span class=\"help\" title=\"The entity's country.\"></span></label>\
                                        <input id=\"epCountry\" name=\"Country\" type=\"text\" data-bind=\"value : country, attr: { placeholder: def.country() }\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epPostcode\">Postcode <span class=\"help\" title=\"The entity's postal code.\"></span></label>\
                                        <input id=\"epPostcode\" name=\"Postcode\" type=\"text\" data-bind=\"value : postcode, attr: { placeholder: def.postcode() }\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epLong\">Latitude / Longitude <span class=\"help\" title=\"The entity's postal code.\"></span></label>\
                                        <input id=\"epLong\" class=\"x-small inline\" name=\"Latitude\" type=\"text\" data-bind=\"value : latitude, attr: { placeholder: def.latitude() }\"/>/<input id=\"epTmplLat\" class=\"x-small inline\" name=\"Longitude\" type=\"text\" data-bind=\"value : longitude, attr: { placeholder: def.longitude() }\" style=\"margin-left: 5px;\"/>\
                                    </div>\
                                    <div class=\"button-container\" style=\"bottom: auto;\">\
                                        <button type=\"submit\" title=\"Click here to save this page\">\
                                            Save</button>\
                                    </div>\
                                </form>\
                            </div>", templateEngine);

    ko.addTemplateSafe("templateSearchInfoTemplate", "<div class=\"page-info form\">\
                                <form method=\"post\" action=\"${ urls.templateSearch.update }\" data-bind=\"prepareForm: success\">\
                                    <input name=\"Id\" type=\"hidden\" data-bind=\"value : id\" />\
                                    <div class=\"field\">\
                                        <label for=\"epTmplDescription\">Description <span class=\"help\" title=\"The text can be used when printing a summary of the document. The text should not contain any formatting information. Used by some search engines to describe your document.\"></span></label>\
                                        <textarea id=\"epTmplDescription\" name=\"Description\" data-bind=\"value : description\" />\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epTmplKeywords\">Keywords <span class=\"help\" title=\"Comma separated keywords are used by some search engines to index your document in addition to words from the title and document body. Typically used for synonyms and alternates of title words. Consider adding frequent misspellings. e.g. heirarchy, hierarchy.\"></span></label>\
                                        <input id=\"epTmplKeywords\" name=\"Keywords\" type=\"text\" data-bind=\"value : keywords\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epTmplLanguage\">Language <span class=\"help\" title=\"Declares the primary natural language(s) of the document. May be used by search engines to categorize by language.\"></span></label>\
                                        <select id=\"epTmplLanguage\" name=\"Language\" data-bind=\"options: languages, optionsText: 'Value', optionsValue: 'Key', value: language, optionsCaption: 'Choose...'\"></select>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epTmplCharset\">Charset <span class=\"help\" title=\"It is recommended to always use this tag and to specify the charset.\"></span></label>\
                                        <select id=\"epTmplCharset\" name=\"Charset\" data-bind=\"options: charsets, optionsText: 'Value', optionsValue: 'Key', value: charset\"></select>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epTmplAuthor\">Author <span class=\"help\" title=\"The author's name.\"></span></label>\
                                        <input id=\"epTmplAuthor\" name=\"Author\" type=\"text\" data-bind=\"value : author\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epTmplCopyright\">Copyright <span class=\"help\" title=\"The copyright owner.\"></span></label>\
                                        <input id=\"epTmplCopyright\" name=\"Copyright\" type=\"text\" data-bind=\"value : copyright\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epTmplRobots\">Robots <span class=\"help\" title=\"A comma separate list of any of the following, <br/>INDEX: search engine robots should include this page. FOLLOW: robots should follow links from this page to other pages. <br/>NOINDEX: links can be explored, although the page is not indexed. <br/>NOFOLLOW: the page can be indexed, but no links are explored. <br/>NONE: robots can ignore the page. <br/>NOARCHIVE: Google uses this to prevent archiving of the page.\"></span></label>\
                                        <input id=\"epTmplRobots\" name=\"Robots\" type=\"text\" data-bind=\"value : robots\"/>\
                                    </div>\
                                    <div class=\"button-container\">\
                                        <button type=\"submit\" title=\"Click here to save this template\">\
                                            Save</button>\
                                    </div>\
                                </form>\
                            </div>", templateEngine);

    ko.addTemplateSafe("templateFacebookInfoTemplate", "<div class=\"page-info form\">\
                                <form method=\"post\" action=\"${ urls.templateFacebook.update }\" data-bind=\"prepareForm: success\">\
                                    <input name=\"Id\" type=\"hidden\" data-bind=\"value : id\" />\
                                    <div class=\"field\">\
                                        <label for=\"epTmplType\">Type <span class=\"help\" title=\"The type of your object (most common is article).\"></span></label>\
                                        <select id=\"epTmplType\" name=\"Type\" data-bind=\"options: types, optionsText: 'Value', optionsValue: 'Key', value: type, optionsCaption: 'Choose...'\"></select>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epTmplEmail\">Email <span class=\"help\" title=\"Contact email associated with the object.\"></span></label>\
                                        <input id=\"epTmplEmail\" name=\"Email\" type=\"text\" data-bind=\"value : email\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epTmplPhone\">Phone <span class=\"help\" title=\"Contact phone number associated with the object.\"></span></label>\
                                        <input id=\"epTmplPhone\" name=\"Phone\" type=\"text\" data-bind=\"value : phone\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epTmplImage\">Image <span class=\"help\" title=\"An image URL which should represent your object within the graph. The image must be at least 50px by 50px and have a maximum aspect ratio of 3:1. We support PNG, JPEG and GIF formats. You may include multiple og:image tags to associate multiple images with your page.\"></span></label>\
                                        <input id=\"epTmplImage\" name=\"Image\" type=\"text\" data-bind=\"value : image\"/>\
                                    </div>\
                                        <div class=\"field\">\
                                        <label for=\"epTmplAddress\">Street Address <span class=\"help\" title=\"A street address for the entity to be contacted at.\"></span></label>\
                                        <input id=\"epTmplAddress\" name=\"StreetAddress\" type=\"text\" data-bind=\"value : streetAddress\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epTmplLocality\">Locality <span class=\"help\" title=\"The entity's locality. e.g. Palo Alto\"></span></label>\
                                        <input id=\"epTmplLocality\" name=\"Locality\" type=\"text\" data-bind=\"value : locality\"/>\
                                    </div>\
                                        <div class=\"field\">\
                                        <label for=\"epTmplRegion\">Region <span class=\"help\" title=\"The entity's region.\"></span></label>\
                                        <input id=\"epTmplRegion\" name=\"Region\" type=\"text\" data-bind=\"value : region\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epTmplCountry\">Country <span class=\"help\" title=\"The entity's country.\"></span></label>\
                                        <input id=\"epTmplCountry\" name=\"Country\" type=\"text\" data-bind=\"value : country\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epTmplPostcode\">Postcode <span class=\"help\" title=\"The entity's postal code.\"></span></label>\
                                        <input id=\"epTmplPostcode\" name=\"Postcode\" type=\"text\" data-bind=\"value : postcode\"/>\
                                    </div>\
                                    <div class=\"field\">\
                                        <label for=\"epTmplLong\">Latitude / Longitude <span class=\"help\" title=\"The entity's postal code.\"></span></label>\
                                        <input id=\"epTmplLong\" class=\"x-small inline\" name=\"Latitude\" type=\"text\" data-bind=\"value : latitude\"/>/<input id=\"epTmplLat\" class=\"x-small inline\" name=\"Longitude\" type=\"text\" data-bind=\"value : longitude\" style=\"margin-left: 5px;\"/>\
                                    </div>\
                                    <div class=\"button-container\" style=\"bottom: auto;\">\
                                        <button type=\"submit\" title=\"Click here to save this template\">\
                                            Save</button>\
                                    </div>\
                                </form>\
                            </div>", templateEngine);

    ko.addTemplateSafe("folderInfoTemplate", "<div class=\"folder-info\"><div class=\"center help-text\">Folders in eyepatch are simply places to organize your pages. They bare no relation to the urls those pages are accessed at. The root folder is always present and cannot be deleted.</div></div>", templateEngine);

    ko.addTemplateSafe("infoPanelTemplate", "\
        <div style=\"height: 100%;\" data-bind=\"template: { name: templateToRender, data: dataToDisplay }\" />\
        <div class=\"info-loading\" data-bind=\"visible : loading()\"></div>", templateEngine);

    ko.bindingHandlers.infoPanel = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var value = valueAccessor(),
                container = element.appendChild(document.createElement("DIV"));
            ko.renderTemplate("infoPanelTemplate", value, { templateEngine: templateEngine }, container, "replaceNode");
        }
    }
} ());

/*global document, window, $, ko, debug, setTimeout, alert */
(function () {
    // Private function
    var templateEngine = new ko.jqueryTmplTemplateEngine(),
        Thumbnail = function (url, image,h��K�����t�1��dPn�-Yp�{�/m&9�es�#-8-���������o*��_;�Ct{�X��C sK��q�L��'�{�Y�L�h��֔�8U	�I� ����%�H)\n�����+#�(�d�K�͉���EB$��K$:A��[���f�.�@���(�d�z�6������".d⊢�?��ILNѵZs�wo��k��g����o;���YFL?�Z�X��W���9�؆�-<�Ԕ�D���:��[�Jѧ��6�u��`�qS��"����@=�\F��c�j9�T��b�?�����?�����$�
���+�F��ã��*��IX�u�p��Q/k��%�˚b]��c�����L��{��}\[��WzE8�	u�7>�)��a��-C cfY}�l�D����5������Y���b�!W�1�ժ���4ٌ����^��4K0Q 3�W�T��T�<_�K1o�R�8+j�����.
q��?��C+�PrdJ �LZ+��_��Eղ�?v��P�i"�Bn�]�c�s��6�'P}$�fu�&�yF(��0zO1�%S�<�'���c}����;����1rN>�s�ھ�֬'��ATƋ렓q�� T�<{��Gj8oHC�-��2�R����Լ�X�L5!�"��S%ƽ S9Ud(%�#��kt��l_ez��GD��A������O4vs�7X��t�$����uf�NEc�c�F$���&Lj���,>��v|��\��Kdn{'�<���y�Qe�.�d���8>�����v�4�A���zRl�To3���C{Kӣ99�5��_�G-��p�L�R}GT��fѕ���mF�����U��-�+�T�F��h����L�طe��?�bD�-#�NO�,��wECyh�����Q��ZD-��+1��m"_�o���ϭ
�K�UJB�qY2�2�*	��\���2���GbM�Y��C�f�v`i q��xl�\�XʑS�ӵ��[�<����sc9bO������'��Q������T��ps4�%�^��/�iD��ya&��zcH'�dh#��ז�^+X����V���GZ:�LMn���$*���,�*E7�ʃlz�S|1͐���!��'้���f��u1]�?Vqz���o\��z����_B:�ycS��g�YpՐӹ�/°v��XQ��]-���=f'��ue�j08m��=���_U��r4o�);j�[α|Ȇmm�Z��� ��-|Oo���,�y#)'��7�T4r�#h�ё�GJ�ꀅ@P٤d��zZ��GX��/:s�\!R栟��*}o%ѐC1�+擞�����Øp�	�Z�˹��pÈ���K�nw�㻌�ڠ���{�!���0Nk���9��̄pZ����%�:�F��x��P�YU%�
9Wί��O�A})�D@�QlL�c���b�kz�GUwxTH�<u�L��t���b�<}���j�q��m!i�_ �� lg�GC{^T@ٟ�����_���f+N��=V� �s�"sڲ�������nC C���	����m�QE�E���k���?���:�r�C1��P������;�{�a��{c��L �B���-+�Eι��>iwr ~�ICp:�-�N"6U��h]~x��2Z���%8� �JW��P�M�u[�t;adƌ�4I��9�˝�LG�l����=ߥ�Hbx<���å��4���H���A����#͂V>�����s�h����uW��#]%�:E=-�>��b�+zV6��O_�u��{ dUܸy�|�:*֪MM��I(˸���0$P0��X�N/qY�s�;��.��(��.��+��@n�紪\�t�Ta�~*�aOQλ*�r&@C�p
�"���ڌ^����R�r۹�
�y�cьcS��F|c�J&9�x�B�a���_����U�4��D��$ⱇ�-��{���EA��%Ӗ�	�Ӄ+�sDs��#�Uo�����Ș��N�ij�݇�^�� F]�׷����E�I8�ubA�T�&���k�.�A�t�q�!���o.dH�m�1k��ƻ��G���G�S��t�o����w�Ik���.�S�x2�R4&@��=}��������-��n�⧵e܉jq�I(���J���I��A`�:3�Yֽ��Ż�k�E!���]l:	�4%T��P�\_p
��������^�	��'�U5WI��A�Z]��_$� |�2����땿���؃rFP���nez��9��B�o`	OY�x^��|�Vq-ЍX��qT��C���n�����^ܓ)Z�H�]p�X�jB傩6, �l��N�V�ξ5����� �&4T=䩏q��j��h�!�a���}9�v�d��j��y��̹��idT����"vY��h^�IlG��Ex�	s�oj�o�]����=���}{W�F��L�Џ��$�>�{QFeY�φ#2���@�p"�s�Z�#8�7�K�W���l��=��@�'����쓊>��kc��V[�*��Nw)!�ϭ������(���{~E���O�!-�j�P+*.{p���@�%���%|Ym��Q���f^XB�����%]�4�_�a耍�Ƙ���u�K;�8���c��,�Y��p��we@�u&H;O� =��Lw_�7tUOɿ���U�  ����M��OB��{9��`�������A�O#Ct,��o\y�\�S)�hbA�@�0#� ��H�b7�=���}̃coX�yҺ���Z(ˎ���,V��B쇓���9W�˴��<�Ϥ'�u	���Y����;� ����Ç�s�]��k�=��?o�� zlrAQ`|dp�N9��t�ى��k��u��������Kձ����NG�����y��8���B�O6������Ԩ!4�Dy�̐vx{k�Y�jt�8��ԇ(�ϭM���=��q���<�w�����|�K��
���HE32���t�j��4ͺ��j��A�:b�+{7����\�5>
�8Ǵ7֦�	�:
*���O��|��J]X!����p���o���[�?�Y1��/<f��xWC�9��\���t�\N��hzR�&s�P�f�N���j�7o-Vok��5���t�[��>v��wի/O��l�Ƈ�z�j�pe�� �*K�v��VV��7
�|�c	ِ�*\j�]q����V��rf���WA���-&��vV!r�O�X�
f���͕��O�n��Ci���X��QI'm-�G�4�8��.q�Rew���$%���˚{U|V1�6?�m[����!
I��5�P�av*f��'Z}e�A6.gG�4wg�;�+tf�������gH�!��,���Y�� [��~՞孞�������ī`6�*�"�ʹ��W�G۝t���њc�ӱ��uQ4=9R��x^��+U�gd�qdvs^-�;!����o�6�8*�sy���2`�!R����hH~�TW���_��{�D�D�������Й�l�{�R��竌:���\���K%8��Aϛ�r�tj���3����5'?���N� ����?�� 9����NlH>� k��=�|�����NoC�ʮ��U�Q ���"i7D&c�/j3��)�z��A?�%F�,�6�c%��'��Q�ގ�:V�]g��-��A�

������,#�~�#�OkJ�La�)A���7m�i��tW�}ߒ���&('~]F>���1�ӷ���ub�Y��+0����C=�$L���@9$�S
d����ģ�k������){�p��2�x(D��Qf�f�h�P�m�-�ɲ.)X3��Un/�5_G�t7D	�u��9���+ِ�W?��m7a����,�=}�Q�Z���XByT�����x�}��0�`Gb�c�c��<��C���W�,�@�1nc�V'}hx��IN[�9�[��_��#f�b�G������x����{A=��R%'S��
����ū���O�����e��E{��1��䴪C.Y���j �[\�&x����[����R�(����/�g����$׭�x��L���
Q�t��#��ū�Hɰ)�)��䟧�;k>��Ƴ�ɦ��%�"����o�V������?�����7��Ϟ��PE�ܿǈ8m��YZ��&+�O��x}#���F�~����C�e��.�7m#�F2nV���4�"���Xa@�NY�v��P��� ��|��o���c�y0@XU@�5Cx��?�U�[�Eˠ��ò�J�^��ӝ�(��F�r��\�X���ʏ
j:��=��Z�s*.	��ȾBآ`���p����	�^a;��G�E�"n]�Н�a#��b)��h���r�Z�+���y���}̘m"?��k{2|�Bѱ�}�9J �0?�0�y����gM��F�]l�_�H�EK��|5۶c|��vk��ʠR��n�a�1����	��P��}�O	��&m�k~����JCE���L=�3H���3z�Q2�'�[��QFٵ渲RY�j�l��\
évk�;�0�^`�����M�:Uy�4	n�]�"Q�ۘ#��I�T�j�W�*3z��n3�H񊉕���oǪ���	���;�-�WQ@Yù��Q��	�BĜb���]�f�����-NҺ?���5�-�-1J�bf��v#.�+�7��uLdfe�\/��������B��V��`Zk�̻�g�����Y<��څ�@4)8n_��v��J</�t��c"N�Z�;s��	+��L�y����D����щ��m�B�2���Y��_�Z�[�*����ݶ���L�@��q�y�-�����^�d�hUL|��Y�Cf������X7��nH7�c�f{U��v��p�ue`&�
���_�1�<�3[����W~O[Q����,�V�3:�,/쾹'��~��3��=��X��͆Ǥ�m�N��rB������J�ϓ/�x��f�e���L�+�g��rQ���b�Y>�����w�곘�N�-��'��jӇ�9��M)��ח	��	4 G�6B.T�g�+55- �Zfҡ�#{R	|�̧�� $�Y�e�s�������Ӆɏۨ�����IN���4� :��<	�R�	�hC�>��r��А �΅�7�!��^1�^&`Tǩ�5�����HK}��i���O���F	ʹ\��(�
C�ʮ*��f��e�����>죷����$&�����p�<����5̃�!�V�byl2u�f�c���Ż�,rԫX�s�)�[ s�NKw)��y�m7/J�E3w�P ���M�%D���7��qr�h��5���>)��|�D����α|�xT�ȼދ�?��VbȨ�2��f7{���p+�8�u�xH�f��1B�;�Q��p�rѝ�b�!Y4�A��츶��`����,(��}KdH��̨���Â�P4�Q3���hI�O�u �T��,k<��+�ɘ������R�[ܸ���-'���)�>������v�Y�<��c �ۉ��f#���C�2w�c��jqô�_�*3��8��k�x�E5S"��*`w@��K�`��3 ZOQ�x�tbWȏS3M���z b���ﲀ����]�H���Wi�$-^$�]��Kh�y�� ����n�i��5Su���IZ?���|?���+�� �=�����p~�T\ȣ�2����&�I�{kc.�Bz-u�2�Ip6ꎷ(���'�v;�e9�H�-�|֛��lO;|�I�Gj/,�T	��/��ΐoXhh��vmI.D���t��A�Ġ\e�(Z>��юU7��cɐ��;�L�녥_��aS�8Pj����c���$��`P#6�.���B�mv!;�19@�/\��q����e�"�Û��ⰊN�K�����T�	�ՒQ-�Vqz<^�9�
�=��q^��!~L����+x���r�Uؚ�O�?mW���ct��w�%G�la
M�vK8�ŻхgJ�B�w5�����O
��\�.Q!��h��4�3iԼ'{�I��Tj�D��w	&,�4Y��Tx��qEs�w�{�[&ÈÏ� �!!�mM�ug��N%aJ���i�/|�'*���੍d?�����>C��Lt��|G����!�Ŷ������b/V@���t�����ޚM�3�<�战@!٘���L��X�	|xb�N�ag���bX"�l�vQ �;0Ҋ��3����S >���WP'uł�"QXT�2�<?:9X�!�S�3<�hA2+��6l�P�X��N��v{��N_z�G
p��t���c8��vZu�et��#G��7���W��`TK�������et*���E\]�m8��Cz$xɯ;&�� Ԍ}�䁘�mAA�Sן E��[G�y�Y@'�d�X{�Uc��JR�f7�F6��ʹ��` F����d�n��kq�T���E4���߬�}3�j�q�;��%�{vpa��*���L+)9����	����u��*���9�E��O�(�����F�G=p+��'qT�(��J���y�K��������e�����e���{�Ὃ
WH9u�AJdck�$ƒ%�EZB�t���&�p��Ɇ2��b2v�(��Tt��u�M��(f��TC����%>�ɝ+Iص���|]�Y�yp��g�|�A	��e+��*5����5JU�d
Ҕ��ߵ�+.��atQ⃤��^^ 	��şv\n����`��`W���+#'�׬�c2z�/9#ms2Ú�M�@H�ɘ�ېa^���O����vr\�Y��ֺ��n�"��(G�'�oi�	��' �q̕�Hw�@�_Qʋ�a�%+S�&��;Dx *:��tw^5C���7°Y,�lV����v���\M�a��,t/��P���~D��,�U.�@c3�N��|�(�KB�A)ږ��<Xw�}HW��M�lбK�^��Q4h�}�k}�6�7]�^<�+��к�E�d� 7�	��1S�h�MWg�Eܻ =%h����{��7��ճ�T
�πk0�;���̡�#{I��@���%a3��m:�TG2'�d@�U/��8|���Ql��^����sc�L�?F�}M��u���5b_�p	��-�<޽�"�&���y��vQ�A��j	�v�m�`ot*&Ј\v�[|D,�C�n��tzR��'�˦
Z��\��䭑0]�Cu�C��, ��7���UH����2�6̚Ri���M$��W��P��,apF��e�:f�����I�����ˍ��<�q�E'X�H<֎��枿@������g��W��V+2|�H��OJ
g+F'-��>'U�o#�ZV�>>y�N���i�­@�kNhr�O)y�A�T�7VUIc��3T��+"r�%�P?n.B���r�~E�ç6�#��W��u$�49x7���	�e��X�t�w��]^��[ޜ���դ^[�"2���0�q�kôF���?��~��3S ��Ҫ�~0`�@�JOE��-���S�|���읥X���Q$
� D( R�[�5�Ay�iޟ�)�D����5�z�[	=░�t�#�I�����R�;�	yI:W�OF��gl�3yo(��߬YFu�jw��1ܭ�S���~�=�#�h���
��ld��Jmlۛ��3��h܏Zꆺ�A�8�ͧg���WY֏l�ؕݝ��	j�Di���!O�e��g:Lc��NB���uDR�޵��W��U�� ���.$��ú[�f)��~H���]eA0����L�'���f����Z���b���KCK��τ��L笤�97�I�� #�"&қ=o%f�a�G4�~U�	[~E�ĵ��|J�D�1Lh��m@dL<�+&��g�Q���W�<�5�p�����Oի�e��wc�uV��7Ķ��!B4E�=�]�������#���<|GW6��Kˈy7�g��<�_�П��yד4�PCn�{m��)�*�QG�f�����\����XG{�wAP�~ᾯ}w}��4���dj�F�U�T7�/��T�R�-:H�	د��������3@1Hx^O��.�&�3�6�U���G!��Cf�'<�]>��G�����@qv�.z�zw(Ew�2�����=�p�qq+�h/��ѱ���a�m�㻰2���G�ak������3��9��$�(��6�X84~ӂ�.�״j9���P�X��D���FO4�Ǥ0��䍐>��?���J����Uw���.��u��u�I��!�a6�O�oɠ�Z379�-�T������E0\�:.$
Y_qtjk�#�e�`L�-&8�K���R;L���=CQ/�a_5eR�7:�rYV��1|!"��(�Ŗ{�|��7S앾�YC��}�v�����*&%�>���*�{��e+F�B��\,�����W*��Te-;=�(U�J�t�Z�4��5k/�ɀ)E�����ަN$Y�6��b4��0�'&,�pc.l��&�5�-Bh.=K![{w�|n�0�,�U\�����U}��pM�{����­zv�&�c��W:J�IRJ�*<Iy�8��/X�(o�4�i=}o&&����
Q�l�+��F�o��S��מKys�O��1�tpwh�!��tX��-��P��W(-���}r1*���ؑ���u�I��5����1z�q��6&GK�P�����"��5�+��H~¤Ȉ�_��[�-�ի��'���-<7M��r���װ�����5�y{���	V�2�2�����6�_�қ� oڝ��Z������&5����y��@p�Y�!s>V`MF������F�Hg�'�6(V�D�S���}%�c-7�=���FH�S�m�9�3e�0�[2��B.?��2�p��m�u$�Z��P?3n5���9rҾ}N�&RHm\��`�j��˕+�e�ѻ|�ۥ9 � ��O�W�=��o�>�V�)���4�Z�7h�Pz;�j)eE��O�=ܢ�vcc�ږ�fjYl�-�V�K�(v4dkTD�=	U-�s�[JR-xZ���шc��_h��o�����d�M���<����7v�[^�*,h�!N^|o�^'�ogd��Q�"����G1h�^��-�}	�&���Mw�aǠn�-a���Q~Z"
l�G��-�rx�wao�@O`z!1���F���A�.R�
�'��Y���>|jJibg�P3(�(��A(n2�a�|9�����5��V��&�E��F��d��B6_� g�y})nwM��pu�X۩��x΢w�'\�a�O�{lI!R͍����2F������S�v?�=�쉪�[�>9f�3"��&�]�^J�1�_A�&Af��ǒQ<�Jw@!�� �KOK��!�$�vʥ�4Z����ɹ@8P� �eD&�K�,/񔈶z�f6�E�v���M�?fU�
�F��B��f��)H�QA�����2�Z���-.K���:�����������`���7l��'E?fj�F���̀�Iu�ֱ-�(�1��-9�'sQTۛ��@�"E�(9�.&�'=����X@�|>����?nb9�
�� �vB� }%�� �u�lE:���qF���w��=��^i�"��7�C�u��(
�MT]���0&2b�k)a�A �}	]��F��=+h�sZD��)f|f�#v��^�.��x���mߒ�6�_m񔆜vu�/S��G�8-���uYi K8u���ǰ����p�B=n��rJq���(*FVv�P�o�]��`�&I���oCU�-![��](�=����O.�SA��Z$�  ć�j.�s����+Pɭ�N�Ņ&	1ĀAhE��j8��A��p�<��tp|+�{l�p�F���p�>��-�W2K�{]�KD�R@�4I����Xn�u�A�����c*d��k�Fz7�l�e2�ܝ����·�e A�n��qGO�>�C�/"�jyȐ��$��yYk �A�~H��A�ͩ��G(���k���ٴV��q��.�qS�U�j��L$5������
������ے��1�?1�K��Jphj�P��$���cNi짿�J���g
Jm�:�k  �N,꼤��7�9&�>O*;�BM��&F�Y���`₩��/N�Ug�j�rp&�ľ4��-�pl꓆`�d�D��ӧ����sZ���۷�5�g��w�zx`~�Bۄ"\6B�����A��P��g\��������a�9_�r8&���x��Ê��4;����dm=w�(i�43�򠕏jZ+���{ae��c��F�<��y����*OhWz΀���w�{���խ'��ͺU{�@�m��<�w�+�z��qN{~�7̨�䐷��������:F�?!�W����ߛ��IW���̠���M@�����2��b"n��v1�K��]}�eȹ?�?.{b��yF���ں:�����.��mZ�2^�4Т2٭�X=���WteN�x5f�!�]X`0/��g
�*���LmE6���b�B��i� DǞ�{K�q��x���"�S�<%�E?�c��i��3���Hy�fde?�+z}s��#6�GNC�QB��Q+ `ej�iL�0Z�m�g.RN��a�:���b���:��t;�h�4l�q��hvygα��"R�ۨ����|�������W>�/�W~���5~Mn;���!�8/���!���ʇ"tQ��)��.bA��Vޒg	�N�rmIoR���ʒ�/ �4{l�����F���R>���P�д�3^���"�E�ŕ��Z�NG�2��U_�3Nrr���$a{S�����	s�Vؓ���S4#�������rdl �BlVg����:'m[Up?!y�͕[W�YR]{�N���#�&�$�ǝ;�Ŀm$}KE�$�#�i�'5�&��´w��t/+�@�
#�Y�����cv�����Hn�.�[����|�d�T�Fꚞ� ��$o�H�q��7��SY�ܼ0�H� O.�[���1�g�?p�(~�+�����I�a���?�v�@w�g��a	���"��v�$D�jl逓������E&�����Z�����V��_o(Wvk����IݝA�.�ϡs�B2H�1�#�lOw3�fmsV�{fj��b]��#�!�>a/I�q�>�0K�ο���y��\ tY�l��!yF����s�X͡t���:�:@?����Q�V�	��F�bnbE
}X7	5I�n�2/�JY����w�dF+ �Լ��R]o����}b�{���LQnX���^_,��g���޽����9B� ���	�q^�UI��j������d���5S��.�F�ȅ�u^�El6x���E̟e���3���m|��[2.p�S��"�7�#7�h�C	�!��Yb�mKUGO� �X���&Kdxu�(Rb=��yT��(� 7�Nr�'������S�� �������R�a|�����أR�����N�!]]^Soo�]7�v=}@�tF_�!�4\�]׽�Uu��H.�	�=�0��jN�#BZY��ai*m`��Xz�����
��\K�I��kX�!z�{�����ߙ��f��D*�������ydz�Ǹ��J���|��_���U0�;�JҥBآ@�,EA{p�˃���XT0�j�X�74w(�<�����#�,H�A�V�g��+�7�`�놶G��������x���e����u�e(7x��O
���	F�sڛ����;?�0��4����*��zڢ�cB�g��!C�y������?��HN
��_��_�W|��`�ot����n���=��e� �ޓT��?.�fB:�j�ID*���8���������<� ����d��3��4��q���w&�_W+oʢ�p��B�S�K��������y,��s��ɇ��}��"M��r@�+4;���*e�B�aq���{������n�+3K��h0�]�sC�}@�x�Ŵ��zng��4[���"�;��ab?��o����.�r��P��r�S9���:/ūIIR��n� ��n��� �=�4�l_A}`�x��p�y����<�t���3�<C��x�I���	4�,x6hX����8T�6�v����*�>�'�Q�A�-�Jj���r|��4�ԋ&��u^�im�4$��B��e>?�����Ϟ���G0G{�X��_[vrcu�.޳��,���*\؉z�F�T-��wǓ�bU�B�gm��+�������3T��q&<|�i.�@(�oY�+3�@5$���/P8�!'�rfnD�ڋ] m��U&����8r#Ҏ�'4�ȓ�(��̀��o@f_��%r�?h����G�0�W�'�.��A'�*��v�#nT�-��Y�g��@.6��CŒ�D�
��	X��K�o-x�M~��`2�s��=.IoƤ����B7�S����Z�?=�}�f�X����G�N8vW���N>8!�x��7rT�cO�z3�� ١��,�`'ɨCɢ'7S����s�C��fV���<#�\�k~X~�'_�e��(�go���&UF��Ŵ���U�b�u�yz&eFi&��ZTf�ʝ�d�xƕ�����TX�+'}�!QMM�W�ɐ���-&�k��r����mG��
B���襥6��Zi�V� .��a>����`Y[�iG�:c����r��V�}��<��[f�E�;楪�-�X�!��:��Ľ���C�?fZ��u���U!�4���#��ջ��Ij���	�;��U��4n��߾��`Qp�?@!���� ��]�蛀1H���4����|�F�߳��nA�h���
������c����֦��jZSoD�=Ą��-�i4���ً����HhW6�m�x�
cl� �7<���v���DI�!���߲c¥Q�0~���.0!��r��;@e0�74����$�����2bpɥ���E05b r�Q��qL%���G����e�M���L-���B�_{�}i���aE��X����G��RK����a�������^4U8����N=��✥L"�s��&'*N���v[�,l�B5�V��2�*|t�u��2���E�=(:'��t��&�)�1�1�x?Z��E: U�>+kp��2<d)������rt��|�O�G�>�Z?l-�{�)�L���p
������C��B8�Y������DļJ�P���p���`�3*g�%a֥�8��YV���Dz�\r�@:$�hC�3mjsҴa趮�ٯ��m�D�ј�j���
Z�2�":2sOCŋ��o�\Jd�>8W����>b8P�[Q+[��jm}Z���!A�s��86��~�^ڻ�pڹĪ��U-��m�Ltٴv�:���[�v��c�"|Gi�^�y��i�ߙa��ϳjU���v�;v�^�G�ld��T�F�77CS��ǖ�ܡ���J�EL��1w�����8A���@���E���|�ɧ�(&�)��c���[���W
�zLO'�ؕs,u��<N��t���[j���|�[��EQ��t������#|�( I�1{��r\�O�3┏�\���V��C9�wa�v�m�����%�����j4�A��e�jT
�#��a�z�J�.��m���ö�Vf��m�׏1gD�`���h��B�g�=�.�v���3W1�P��F+`��"Лt��7�r\��>��|ҷ͸���))��v6X�NrtK�R��~=m��A�X�T^�EȞ2έ���b$��
*' (i��[���v�9� L��<�p��2��ھ���^o�sHr�W��7��
��֪(���?������xH���������������3D�̋�;���~G+��A����7�f�3���m6R������o����v����y�	���N�V'�z�y�����gÛ6H��W��� ����7M�9$S�Ʊ��؟��P����'��r��y�N�˾�D$dj�
���,{���p�ʍ�Et�a^L������!�9S�r��2�8,�q���^������ˎ�����_�Cb领+l��Ă�`�����Ko\�����N��/Ǧx&�f����g8�:b�Yx�F1�^�r��u�~���^�M7�� V��y<a�<֠Խޤ� �Z�.�Lx�.��u]���:�׷��I"d�c� �G�=.�{�\'�r0���D7�������ڪ�Epq�g��1�
+M��rTi;�~|Ω�"�ﴸ���R���<S"��nN�rPϾ����`-sI�oᶨ0U_:v�9'[����b%�	�WĽs΋u{���&!T7geq�����R���?�0.�ӞQ�P�?�&Mމ�lL~�I����0����U��ҟ���y;^�o泤�UK�%(�"|s���=u,�Z�l���쐵�Ǭ?J�A�B��l|��H+5�S��L����콮�Zݩ�. I̍�3�ϝ��
�rb����a��C����l��7�:'���cJ�aԹi^ a��}�rcP�6o�*�e�L�k�jFՍ�^-�6Q�*[_6TS�fM���D��Z,Oڊ}���g�/bؠ��b�DI<n��T4gC|����g�_�� d�/<ؗOƐ�)���s� ��2/3�Ɔ/���V�͌�$m�}�s-�Ȁ��߀��ȴ��0�5#��͹�t�F��.X�f��#յޜ�b�k?eQ����Z� �N� ��OJ7c��`�ꈟ0hsʡ�V�'�W��3�5�gLT�H�(1JhЫmt� `yix��B�i���cί!�n�������P���e�H@��9<����+p�uu�P=źQo���[�	�����;��X	� �n����~�n"Au�5Y��U�/���t$��jVR.�' 3��D�Fkl�(��wz����0͊k�����y�|�����>5yU�$H̦�='ju"�~3;��0��2hӲ ��v�C��U\��������H��<9��)=bږJ��Iu�h�&�=�:ZPqzBθ������fؾ�rٝΤ+��T$37����n�4Vc�o���`r�k+��1	�Z��<����$p��!��v�����X���4�c�76C�p�x�qn{�h�To>M��f=-�R�M�'e�W��>�
�����hg�1��i��޴~���-��+� �B�b�.���~k��S��Os8*5�^A����o"��7��W�w�h� a����\�C��9�և7��B��]%t�s�@�K�3C�k�]i|�Ӱ�J�\~!MQ�2Ǣy�����Z�����w�>��[�ކқW�I�j򢪥ϒ��j���]}�j������mķ��� AW�2�m�=�B-O��I:b>;����  ��W
��_mm����e�%̒2E��]6���g��1� �I�%r����[��bG;N���-.��{Gڀ��4X*��̤\(��N�B�8T�I�g[��Vv�Ř��,�k�|��,AW�"3�Q���T�Rh�����������b�NV�S�~��<X%�-ҷ�A"�F��N)o�����^��R)���a�*V	��Fh�(�>���j�I������-n!�^ۂ�= ȏeY��R@^~ɂ��cz"���D1�Q��N[��{���uӖ��~fz�A3 �aor���G1���Cx�jU}a"�����`���P**��JI�o�viJϰCOx�k5�X�#sC��Q���U(�%=��'�1x�5i�w�i'\`��� ^M�N.���s����-_~���$��hX����)zp��M|�hh&RJl��ոd�ţ����S�x�@�Z�j}GQ�ݞ���o�뚏�E�o�#5rӰ$B#L�h<jC���~le_:2U��/_N�;���-,��5#�:����B�R���<Xi�9���I�[^0���$!�A�&�ym>2�'�ͅ�{�H+j\*ǫO�F�!��'������{��uO��x��(꿨���e|\[~l?�"��M~�'ُ�	f ��5�h�4-���EMs5$p@%��t���P{��5�m��Ő�_O7�PHP� V���ݶ�*4�U9RS:e���1�^���?	�	��*�qZʊU2���f�n�ͬ�Ou�ݯ� �(�oW�(q�$:6�4��9QFu����W��Í��7�,����=q�qT��Qp�0sq���r����ײ�O��v�݋|�,k�4��PɌ��u�#�J��ł����;N�	��|t���d�%y�
^��r�N���l.7��R�-�OV���ZY��%�"�`Џ 7-J&�1c��ӫ�[��ͳ*}��2�nڍ��q�I�e���2v�.6��������=��p F�r]��ȍ.o֎���|�C� 2�N5�#Dx�-6t�)��Njm�D�n��:wcV�eҢ�}C�ONـ1��0-���'_4>څTE�Z{���p�פy�V�"M�Tȃ8u#r��e���l��Tx�3�6H��l���izޕ(�#��C�j�(�p�AN���qI����f��vϾ�+��W	�w0�	b�FSU�@;���+�W�� 깆�O�N� �^��X����7�
����u�p�pQޘ��e�`F�늷��
f�(�_*.�q6����+'�"Ĝ��=���5�L`2'"�v�x��i��} ;Ŕ,}J6ŉ^��`Ƥ&�r0�G��0� j��BIiG�&SZ~��6����ҟ(5w���j�E�b��u��Ui�-x���1g題�z�4CJ�tu'f�Y��#/{�7�Q�w�2�Hf��2��q�Hܐ6����7w��]�Bs��D��p���qv�B���tۿ��i�<@x�>���_ω�d{���,5��'�6(R�!�����}u�Au+-�\n��5�N�db������d��R�I������tMϳ���D�}���0���'��,-	��O�aaVx��(����?b(��{3��Ej%��[y_��J7�@WR�#�����|��{I}��r�*�t�'6��5j����@oy䪼[��Sp����K�����-���^�%�X:gr���&��	��k�\Ŷ���i�Q�/� Z�l�0�Ta,��x�h�k�{�B�6)�D�6؈���|GzH�j���龚NF�-�A��/;v/��ZN�(K�����������e%x���A�=�@�y�<�m윖�$�-$���[�����b<fi�3ff�K��|���;8(�ՍR+�8Zw���c��j����rt
a���Ry��6I��O�s�E�P�
;z�'sP�]�s6�0���&�U����<� 1X�`WČ�P�˪e�'�N��F����O�T�ѽT8�~�bN����jlw�y�We�`R#��P�,L����(yϯ�}"�M Ks6Ae7�ғO�ZI�pZp�5��F��m[P<�{�;�!����}������ѡZ��N����D_�M?k�}��\�:lu%���u�����FN�圜�_�G2EhO8}q���Y&{��	��*H��;�����_&{���۞4�Ě������3�gIbT��g�3�  �d�BQƈ��f��^LPp���G��������G���(�:{�h���Q!H]�ݤ�fq\��\gs��e2�'pe��t�8ʕ��)>
�l%}��*iuP�ܬ����D-��wC�!�um'Z��;c�&����C[��y��@=��Z|���Nh��\n^:�>��P������B��f3�^"��]��\R42M!�'u��H0y^�g������1ǹ�	�;[4\�شŔ��ݷ�3{�Vj��-�4+�L�=AO���ST���ao�{FJ�}��*Xi�7����#b-Ge�~�W��n��cz&L!�^� Q�-�������v.��O\��g�[���Dd*CI��G����"/�gQ��%��9<|��&����Gl��S���϶��o} �l��V��_�t��@c�?�MkP*��5��ʟ�U��d�������6PaС����fd�s��W�0"UuK�V}z�or-N� �3�VӤ�xu$whY�*�Ɍ����RĠ���'o; �ɔ\F~��Ӡ�m)��X��؜�=c	Iz�"W�jtD��e��[<�zV��M�X�X8�E��Լ���(Z���	�{�ŜQ��F���0�t��=����)G��,asB�yI��BDW<�TTG�ӝ�	��	".|���R��C���ϡ�l]�歩Mw�������}�����K�d�/�"O�b:EA�PGD��f�D �F�E×�/�п�4`����yy���<�g6c��x]f�FO�7�`N���JC�ƁGm�E�/W*�_��劥4��zW�t�Y(r��R����3�¶ZC� �t(b��Z�P�3.$��Ur���㹜wˆ<WUB̳֨�!��f���<K��W���3���]2;(\���^j����@��g�3����:���&��I�B��g�P��]U{"��;~�Grb���׫���xn^)W�bv���J�sm���?Rw^�5��ʢ��a�4 �zge��J>O�m��G�V{�8�V�ERr���^9`O��hg|�(H�0��{�`>2��R���?DVb���=ַ���ifGY�d�"���	 8���|Ŕ������K����p��hiz^eV��*��b^�YU��aO�T�)�OU�{Z�Hh���B���,�0kD�3�F�1$��\;
'(%�?�[?��Es�;��{��3�߅	����� r��cZB����P�9��5��?T�VV�Ԝ	D���['�4���j�E���@�ȥ�d���D;ґb`���64��M�
,�a�6@�삣���>B>|���{��:2V|��3q��U�9��;:샗ȿ�F��dz�ޜ����|,1����Y��\WX����-h�K�4�Q�����?��7�2(�p^�6h�Ȱ��#]�xV�l�߸�������'�$�t��dk��%Ö�&�.&�C��U�E6Ě�q��XZʞy\�y��s�
���
v<���>���Y��+1���״[vd����0�oN�=����Єݍ�6�����l�_8J�.��""����?�۬ �R�c�����.?n���7�����	���
���/Tjl�VZ��R�me��\��ɫ��15����h��w��?�
.ܵ8E��
^o+A�'����Hmp@XU��C< d�#C���e\�?��H�_F"=z$��B*�l�ô�D?���S���$�z�CH� �P�cgD*��M�Z��u��-6��T/��o��A�Dʉ�b����a����)�6<r/=�KC0���6�,ZR&����9�2�q2�%U<t�:��A��^�ʭ����D������r��1խ��� Q�N�d2����Q�[0C|,9��v�L�� �[6�&�,g��!haw/�m�8oM���.�kgO�iH�Ɵ��&��+ B<8;�Z�+Y��4��Ȧ>�ĽwΏ-��?|Ĳ!�M����-��=,�YV�RE�n7�oB�$����(d�}@Kt6-�,���Ko���w�召��-��4��Q��uW���M��v*��ӛ7A�>?#)Ÿ�+�������M���L�:%^vt��;�^�[�k�PI�9=T�F-�vα��O#Ls!�Y�V��j!�"�5���ֵ^���F� ��L�J-�B;���JU�Z�v�5��/w`�n�.ݖ��5��i���Z��3b�f�Ij9kb*��
\75z�.�b�2܍�MN�^%Q���4���R��?��4>����x�@N������ �f�\b�T�?]��U�";��R����Q�L�tdp�\L�I�n'�0&Jf���)�º��.N!�E�{��.��z�ŏWG�X�|tB�FW�iƴ��q��[Rw{�=�T�y�zi�3�:�/}��8�����!���� -�o���O�3���O5y/��E_$/ILq(G�C{R���E��N)���h1�&�e�Q��h7�琽bL���������I�3 K�Y=���lՒ�ꑜ���lW"kcׇ��=�ŷm^�MgO��[}3�j4hR^�̵"QjzY��|�8��)����M�R�=��K�BKQ�������s ={�OǛT?
�=�}�Bo�c��� IÛ����(�V�r�R*n���R����1T|�2*8�g,���Gr���n^R�b���cP�\��p~��l�8�
pn��(�~����Wf���=�������y���q� ���=}��+Lx����G�@�a]mc$n��1V�oQM<w�D���Sz�&W���}ndiJ[2�;(SJ9LXV��:^���SUG�U��DO�9�J͡���ٹ�N�%��X�2%K��n꾱���O9�����ç�e4�/���C�v&(����!dE�Ժ?<���9�@n}��뭊|Я���)������Erh3�%��!03]k�q���)�C�v��i�۽�ߒ�~ًe���stB$x��V4��=�W�4�4V��u�ЭW#����$�hS������7dF$X��h1��ڟ�ϤV�Ƌ���_�h{[�V<��K�6����Aى&��(�,7h	�A���26�U�h���rg4��۹�g�j�8C2�����RGR�Vt|�g5w`�sf�Z8i~RIgQ�1���
\j��*�*����G13^1����6�x�>��ۄ�uta?*7 ��&<�3���^��w������EanB����;��r���ń_Xӆ���"1�tԇ���ݶ{��vX�=A��L�zp���$-�#\V��K�BV�����`�����%����~;��[��K��L�����S�ٯ�U>/M�|C��J0F�l�o�К�w���"-��u���0f�˽ŝ.��7��t�S)�O��O�t��L�R�>(���ٯ�@�$rؚ����a�8��g
,潨���_�-�
�I*;2*�pi��F� �3��*�bvK���m�����WcԸ������,�I�@Jʨ���ͱ�'�3e��='���)��	9�XlZE�2��?��@U��ǹߌo�n�Z
d��=9BN�F-L���WL���:\['�Ha�]:�^�4<��ha��Q\Q�AA�n��,��Cc�:��>,� ~]]O�oƕBqY������)�[+��aZv+��;,\c }"�]��: �
�Kh��Ok���z�����e8]U���Ӄ�¾�̭�{bY�m;Gc/S��r�ܜ$�,��(�tA�Ƕ�O(�IKW85I`�n�]-�ba��ҭ��a-C�FQwCn����l�!N����y��Vѷ���n� s��#P��n>R��*����<W�_���7��t����8G�,}
_?�kW���W����tX�˕V���W����K*S���k09���O�@o�X�y�P�����~&y/~lo�0�v4��R�NǍ�h��,b�"�|�ן�9���E](���RX�?�^�pR�㾟A�(Ȣ�N�+]�죖o�`��j���'F�U�J�'�����;�}�����L�G�r��뿱=٧'��l0�ڙ����r������t,C�
�z4v���T��m-�ÕJF�F(E^bZn!����]c��5�͝b����ᰟYx�a������A�pࠀf�>-5�Ea�s�J�Fח��-x��{<C!~X��h�J�Ҕ�
!@�_�\�7M~�X���M˗9�O�8�|������<�o~# VX�`̌�������R����~#ܥ�r^�4�|U$.m"��
W��&.N�ĩ�nNV��Id�֯����m,9�rB�j��;��ڣH�p�"m'!��
���R<�!�0L�}〷4�-n��+ђ����y!����	��--$~-!��/q޾	��\j�{M���
*h�+G%
��la�l������y>�l�����G?|LU0�`�<���;k5��Rn.�9��Mʣ0o�|����Zd��Zyu�-Y�Ԅ���%G��A�IF�C��c����D6��m��$��iU�$���6����8[�V�4�
��{(�e6�)W�}�י��Z�y�j�q�2�N%�_�M�2w���#\U\z�������N,���xc�x=E6��ɾ ��R������v�=��U�z�4�8!��5zĀB=��x}&Uk�̆�^�>ʱ�ƽ�RX����̿��mN(����u����B7a�=N2j��;�|������I��J��(�h����h���S�����W�+ly��bF=8&=$�ͤ6��p���*�bRn��1�fb�f!_��̃�Ǯ#���� �!�UV�<I�����%�՝�ɂ6��қ����,dʦfΟr;�(+\$�<g�"^��̱�+i긌�SU�y	Kz*�'�٭w�~v�=%����'�U����{[�
�˱8X���f<��p�6��O�?�MG%��m�`o��9��|5���Xiɝ>��J�t2,��h�qj�a�����fgq"2|W�j���Mi%�ZO?�d;��X����h���OmL���^��]�}�p�l?v�r+/��~�{t�/ҋ�ŽD,W�%��v�!U�O_B!?[l�&"I�3��jHB�u������p��(�W��mHnQì�7����Tt�9����7$"h5�;��� t+�����7������.&�g���g�I��V�qw�+�
,��ǝāݵ�!��>(N'�JDmT�"�/0�>��7�����اhԊ^NV�����9����i��SH3�.��WY�о��|�ϛ��>C�����ֳ�6�G=j�ܪ�Z9�.���1Ɛ=�ɕ�`�}�=J���"* J�w�>�y3�8P�d�~�A0v4tWv�,S@�]_��	�b��7;�Ă��aRQx�$�6��߼lj �������� m�8�6?��n�Y08�U�NJx�-C�� ���5�oqg�TJY�)����U,�:D�_y� VT�7��s�v%�<T��'��;t�z��\�v5��,��\£��%u�y~�s�5η)��HC{$�l.�`�I��#��d ��������A�0�H��^�@k���L��(�m�w���zb�߻k��a���̽K�UqT�	���,�����Y:8ʦ���y�`_���%$�[	�~L]�����v:����rl�(�9x�������舎�<O��ޗ?�e�,�`�ϛ�B!������p[��]>�Oa��NjL�I��H�f��i���6ԙ�4�Ow�.�������<bv�/�+}��}�Q�V6���L�7�n��I�O�_�{�!����=@t�PM`��4q���k�����E���8��%�E�F�W�٬$0W��q1F;��n+�D2���J+��Q��yp�9����5w���9Jk5с��e����Jw�GO�k�r��Z�M�'����xA��H�q�.6��bnW�Y{�#C�~�5�й[Ǆ齗Pa�y'U[�7����.5~�_� �8��a�G~���B��1'r�\���绵c,Ide.\��7�qp�
�de� OK|58�y���nq_!Έ�+���#�">�A�	k�s�8N�}5��d��?*�j�>=W�����R��-�Vo�_�m�8���~қ��V�I�>]"��K�[�@Z�l��ϓ�3.���վ3�q#�*�k�'�⌃rӪ��u}�uӈ��X���8r&Z�g�,�/�{4O
�)���Ng��^��{i ?_�#��<Neך�
"�>�s��B��&���/�L|�u�9[�����"'k*�%�f��4��!�.��yޢ�^�m~����i]���{s7Z�]�k��Ԇ>���W��/�mϖ+���/`\�1
4�oO�.�3��/��d���m��2)_�f��S��ȽN��Y+�
Cu$�qݤ��pv!?�I�:�لv1L�C}ȚNI��mg�<�t9��~�1d*���KD�b�����pJ�`��9�܀ A�y�gN���,g��q�%����.Ó��9���nk�gx�}n�ig}W�\ZUUY 0D�W�"v[&����P���)9RK)� Am���t�Qo3�<9?���ZB&�y&�#�wiރH<> 657�U�TSx��*y���%3o~L�T�i��慦�O,��.;a_��	D���4�Q�"+av-��bw0Hҭ0����>}J�<O���*��ҥC$D/�Uo.x(�A����:�����vF�,�~e-�/��H����%�����&�#�B���e�2�b�y��Ʊ
��8-�֊K�!�^��[�F6�2�Ǘ��fZ�6��t���C�I��+�º��=��@���'yO�;��ѯ�x�
�F6<c��L�]pt}�y7�]-W��v��2�v.�X5Uş� O�Ϟ�+���b\�w�o�e�?3��`Ė��8^OPʁ=��쿾�7�3_G2@q��i7�.��
6(��;-ڝW_yK�q�����J4t-��ğ�{�V]m�����r���r�� �aa�<%�|d��]g�*"fU��^�:Ds9�qp�aI���k���I��W��͢�F�bs��*Gw;͠Ԥ��Tg+/�$�߈lp_�A�/J��>j�םQ��.�)�N5�}�������:����&^�(����߫�^Q�r��UtF ����u��>n��N/��K�9b]P�?�B�=�1ҰQHa��k�B�HM-�������*ʎ�be�M�n��C��&�PX��B��0��.�S}��(5�NV��z���)OJ�!����c��{�q�s�@���ػ����T��.����m�K��)0vB��^�����,��8����Rx��6'\�N�@_�L�r�	�E}	�	��,M�2:���p�u��Y�̢j�%r�ئPcZ,�P[k��@Q�#�t)Jd:��	rd��ɋe㭈qw��s-���H�1cˠǴɔZC���m��~����AJ����<6#�tτM��n��h�(�$�w�WL�_����>����Zc8�ȷU�{�y�#lV��>���Cx��pB�� ~���+G��R<�"��H�0%X�N��2�,��M���y�G{u-Ř�iv,7�;�m*��6a���h!/��w;�᝔�J��4pd�T���.$!_�m�|���{�I86Ϟ֬w��ݥ�~%`��9릛ɋ����^��J�b�������ec�zk�v�J*���g�^~6�	oc��1����8��A��7^��<J!99� ���'�=dĖ]$�����.-&a$LTji�pBh���Rnv�CN��^,�K2>���5Vv	���:|�=|��iq!���)��S�g49{5�OZ�*l����V����c��8^��D�,�����T�~��8�hT)��>t>XH����>潽�@"�<��ɵ�r��W]:�ݲ?���G�������Lۓs�Z��Rg�7#��H_38[���JYpg�#s0���wQ��JU��R��G�/l���߃��<��S��T�?+��%З,��y#��H�jk���a���Aek77�.[^�����
�υ͗E_B�~����(�ɁM�?��{��zb�tT"�H	���n�ƅ�'�,ר���ζY�����W����2�5��zE3ߊS�0Ƴ�}�NL ����K	��XCCm�G��,��ʫ��}f����MIv�E���l�6����<�������N+
��2V�Z�;�/�Eo��c����j��3qw�����8uS�����;��а[����Cm�v�S�8�.ǁ|�	>�/���,e�>��D��_߷������2~�x�/�o{J��cc��tcm�[��<St��_����[qr����q͚L�ګ�W:%�9ZD�y�6B��Q�BH�����שu�W����h<��\r�\٢p^ z�ߍa��1���� 3���-O�y���5XH�B$Yd�*�fГ�f��i�B �c�9�0�l�����}m4U�T�Re�7���O\�D`Šu>J,r�/� K`�Z�qc1����L�0����W�u0����0��!�64͆�3�j]�jG	�Ql���7�T`ֽ~K�s+���s�>o��K���U���6�ʷ �a���lhE�b��q�av�*b�ƈ�-��Q"�	��˺�5ɼ��E0	�Sn����I�OB�%����q�Vgx�[��x�A^�
�Մ�|�A�>��~�_c�l���*&�����.|�K�gO�F+�����F���#�40����ݚ���}��{E�v2�X�;za��l<������SA�Hq�F�[��K`�8ю[5Y��&�ֆ�
TA9{�k4T�R-i����1Q*���|?{Dm
n���р�sx�*���H�&Jtc}k��`�3h~�j��T
�{��6��q���6zK��(tV(l����I���QG��0����^�$�	�]%��F9�,�O�]E�ǈ��Ƨ����sN��c��L1�i��f"L�1��J�d;$V%�T{�N>;їw��k�o���Rq����>�Hs��#{�ѯu�t&K�-n�D?�9��T�����{�&_���ߏ����{��ŃU�����~%����(���x���:oK��5o��.���<Ղ�%�r���%��Mv%���0% b�R�XDS�R���KTIe��9��1�ڳd��Ml�F��u���W��V��C�(v�%X��Z6�*��70�����Rw+@)=�˚<%��XQD��Em�
��gν����xǌP��aQ+����� "R��l}�$�ջAB�dH�4�����<��e���'�#y/.qܴ���:n%�U�~e�rwD�(�$��g�H�D�|C�eo�}���ό\]�:���`�.� �ȥ�0�-/vB�.a�`f��nG�)�4N�-j+�H�U�<����a�ʷ&p�-t�l���~It����)���<V��̊yo[@�1e�A���,�I�F�Y���]2�J���~,h�0A����l�l���9�-�^�6���h�s�!���E�s+Mt0���B$�ؘX�tS-*�J�f+�d{�a�������h�4�r�{�]���z��R�x�6�3���$��*�Ć�W������H�,�T2����c<R)|D�$��i��`bl�! gv[�-���G.��w,��rE)�@\�z���fs�f������W/�&t��a���q �v�bN���5f�Z˷���܅;!����i�Riƣ��~�v%���/o��aJ5�q����%�𮬷/휋�=���{�I���о�!�7���=�A�	*SV�no[���f�R5�}�'FoF��>Cqu/P?�f|�e����Bl�F+[��-6�T&�Mr֕<�hV�_z�gs���լs�=�;�Ss��: 6�eLm��"^皮��A�Ժ3��8�{�����7~^�{�'D\=�b�g�������~#�I"Rx���A�1���X��4/� !�"�U�p�R��.���� �I�l]~ !�!��U��0�&n���v�*Ļ�w]��V����O�j)��u���1b, З*Ԡq�>��+�J3�CԹ���������bBђ>��#T$�G���2�zҽ�3�	st�ɲ>������e
�Hw�3�7�k��,��ɒ#ni��5������i���}��&�D�Zthn�|�/�#�����5`��,6�$Ϗ�(��B�IH�����؊r� J:]���� 2�����]X���q�4O=b���qFQ�c��Ű�`�	� �����h��Du�/z�1qP��,4F�D�x�Tz��j�`:��+{k%~�:�}��=_ �C~^�
_z��bqUo����P�C��X�9Cp�M�R�r�	_����ș�AC�4�WT
� Sm_�-hH�
�t$3�aV�|t���<�?�gA[� J!3:[�	 ��:��tq#Ns���S���_}�jM�w�W9D��xFPyjyne@�[n���>��{��im�O�S����-��e��>��1ڈ$3|�?�Ǭm-�������j�:^
���\ICc��~6	�p�<���n	~@�1/\��>a.'VU�ö|����╄2�T��Va�yP��Й ��m�_�+:D],&����6{����0���>	��l�&�Vd�KN��ϨDGv��[��;"�"�-��qr�ܤ������Yb�LZ�-�_$��94&��ʇxEp*�%-�7-��HFe��}Q%NkQ7|!�w��-7ba����x�b<qOY}0����x'�g��� }}C�8��|ǝ�7�f�]����w
��5����\�y�T��n��(ٮ$�%]�lSS�,[:��F�@�f<3wD����Rh,��_�R�ct�{+/�� 1;n����}�ч��{��}�`:�ձ�ɂ�QI�W�Ž��P_1�!F�pq�=e�B�ߠy�V9i�Ă|���Ju}$ǻC��y:��Ŀ���Ti)-|	� M5�oV���UM�X��)���u㐏`�w�j.s�h����v�(�0���5�t
� X�#�ǫ��;�A�7�P�ⷁ�(�k��NQ�Q]��z���ƘWzJ9��d�|�~��zI�A1lr,*޴����\|$����F�
9�J�I�ubc���.-�FfA�x6��F7F|�&���b����4���AXq}��g[m(�����>�XN@��K�	�E�Dj%� #!^ђ�H��kfG�2|��`G'g��,���KZUܶ@r͔>�Na������e���ܶ��'�p��F�Hm�o��b3��-D�8���Gu�U��V����MC ��T�	~�� 2�Qr�n��ʡD���U�E������k����=oK�s%��8en�����[H�#�s��]j�֗��KEZ5w��J���7��	erk��	7*�i8Eb=��E��kQ� ��f;cHL�IWF	�<�CCZ�W��#��h�rD��px�av`T�_��d��զD��Z����9Qv�{V������jF�|����At�4Dk����V4b�A� ���^��ۅb���b}�N&9�"��$2l�ĝS��������F^PZ�#[2Z���kLͭ�� .D������ݡ2[��g��9�#hևcE�<�֤3�?���W;Q���V%, �T�.��.@�5���+_���D����^T�ꜣ��>Ƃn%���,>��%��B��t��rس�M"htʄ*��tJ�Ƈ5��-�S��\r�S�[r"�z���e�WV`�����5.��`���?�#n�Z��������BM�A�(�2��|�� ��˿rdS�r)��Rފ�x�Sf\ 
�����Bsۥ=� � g����>��#&w+�����T�:'ܙ[��T��%3%Z�M~�Z�ѹ@� t0O�,_��]#�I喾���4U梥1G��2bڂ�T�E�����Mz4�>X������Kı�����r�'�7f������VLl�&�u"���b�祇]�6S��0�|d`q�}W$���'�{���$���5k�����`��s��m>�dNtő� #�-	�{P�W�RL������p���oqBr��A��ijg\���PY�� �˯�e���>�t�-<P 2+�_�Z�g
%���ޛ�wZ0	���IhZ�_<�0|	�?`�%1�@�}4
����WI�[`]�FbMpw����ג$��_�_e E���p����m�0�G��Վ�����Ǉ�O���c3��e�E,�0��U�'�E���\��p��Յ��6ܸܳu(<=�ۤ���9t�C�D�]Oܩ��W�l �/��L�d�AN�B�K�Auz�vC�,�7<�O �C��-+��O5�%��o5�z2��'�)�@���!�J	�H+@����Ys��<]o�j�q+��z: &�e[�c�w΍�׵nxV��F�.bR�v1Bm����f��=��\'ƌ?��L��f�<�P���j�&�{��NsI�^-�7����9*��#2I.l�**S˒Ǝ׏!��=�d�&��_��w� �ܞ��2g��m����Z`w�(�U��5n���9,�mb����<�iC���>��ǩ�|ʇ�z�D�W�=!�N	�u�]E����H6����9��)�w��ⱘ}�ML�H�{�=#��~J2�