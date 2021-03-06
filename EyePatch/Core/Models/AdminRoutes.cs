﻿using System.Web;
using System.Web.Mvc;
using System.Web.Routing;
using EyePatch.Core.Util.Extensions;

namespace EyePatch.Core.Models
{
    public class AdminRoutes
    {
        protected UrlHelper urlHelper;

        public AdminRoutes()
        {
            Page = new PageRoutes(Url);
            Folder = new FolderRoutes(Url);
            Widget = new WidgetRoutes(Url);
            Search = new SearchRoutes(Url, "Page");
            Template = new TemplateRoutes(Url);
            TemplateSearch = new SearchRoutes(Url, "Template");
            Facebook = new FacebookRoutes(Url, "Page");
            TemplateFacebook = new FacebookRoutes(Url, "Template");
            MediaFolder = new MediaFolderRoutes(Url);
        }

        protected UrlHelper Url
        {
            get
            {
                if (urlHelper == null)
                {
                    var requestContext = new RequestContext(
                        new HttpContextWrapper(HttpContext.Current),
                        new RouteData());
                    urlHelper = new UrlHelper(requestContext);
                }
                return urlHelper;
            }
        }

        public FolderRoutes Folder { get; protected set; }

        public WidgetRoutes Widget { get; protected set; }

        public PageRoutes Page { get; protected set; }

        public MediaFolderRoutes MediaFolder { get; protected set; }

        public SearchRoutes Search { get; protected set; }

        public FacebookRoutes Facebook { get; protected set; }

        public TemplateRoutes Template { get; protected set; }

        public SearchRoutes TemplateSearch { get; protected set; }

        public FacebookRoutes TemplateFacebook { get; protected set; }

        #region Nested type: FacebookRoutes

        public class FacebookRoutes
        {
            protected string controller;
            protected UrlHelper url;

            public FacebookRoutes(UrlHelper url, string controller)
            {
                this.url = url;
                this.controller = controller;
            }

            public string Info
            {
                get { return url.ActionSeo("FacebookInfo", controller); }
            }

            public string Update
            {
                get { return url.ActionSeo("UpdateFacebook", controller); }
            }
        }

        #endregion

        #region Nested type: FolderRoutes

        public class FolderRoutes
        {
            protected UrlHelper url;

            public FolderRoutes(UrlHelper url)
            {
                this.url = url;
            }

            public string Add
            {
                get { return url.ActionSeo("Add", "Folder"); }
            }

            public string Remove
            {
                get { return url.ActionSeo("Remove", "Folder"); }
            }

            public string Rename
            {
                get { return url.ActionSeo("Rename", "Folder"); }
            }

            public string Move
            {
                get { return url.ActionSeo("Move", "Folder"); }
            }
        }

        #endregion

        #region Nested type: MediaFolderRoutes

        public class MediaFolderRoutes
        {
            protected UrlHelper url;

            public MediaFolderRoutes(UrlHelper url)
            {
                this.url = url;
            }

            public string Info
            {
                get { return url.ActionSeo("Info", "Media"); }
            }

            public string Update
            {
                get { return url.ActionSeo("Update", "Media"); }
            }

            public string Add
            {
                get { return url.ActionSeo("Add", "Media"); }
            }

            public string Upload
            {
                get { return url.ActionSeo("Upload", "Media"); }
            }

            public string Remove
            {
                get { return url.ActionSeo("Remove", "Media"); }
            }

            public string RemoveImage
            {
                get { return url.ActionSeo("RemoveImage", "Media"); }
            }

            public string Rename
            {
                get { return url.ActionSeo("Rename", "Media"); }
            }

            public string All
            {
                get { return url.ActionSeo("All", "Media"); }
            }
        }

        #endregion

        #region Nested type: PageRoutes

        public class PageRoutes
        {
            protected UrlHelper url;

            public PageRoutes(UrlHelper url)
            {
                this.url = url;
            }

            public string Info
            {
                get { return url.ActionSeo("Info", "Page"); }
            }

            public string Update
            {
                get { return url.ActionSeo("Update", "Page"); }
            }

            public string Add
            {
                get { return url.ActionSeo("Add", "Page"); }
            }

            public string Remove
            {
                get { return url.ActionSeo("Remove", "Page"); }
            }

            public string Rename
            {
                get { return url.ActionSeo("Rename", "Page"); }
            }

            public string Move
            {
                get { return url.ActionSeo("Move", "Page"); }
            }

            public string Navigate
            {
                get { return url.ActionSeo("Navigate", "Page"); }
            }
        }

        #endregion

        #region Nested type: SearchRoutes

        public class SearchRoutes
        {
            protected string controller;
            protected UrlHelper url;

            public SearchRoutes(UrlHelper url, string controller)
            {
                this.url = url;
                this.controller = controller;
            }

            public string Info
            {
                get { return url.ActionSeo("SearchInfo", controller); }
            }

            public string Update
            {
                get { return url.ActionSeo("UpdateSearch", controller); }
            }
        }

        #endregion

        #region Nested type: TemplateRoutes

        public class TemplateRoutes
        {
            protected UrlHelper url;

            public TemplateRoutes(UrlHelper url)
            {
                this.url = url;
            }

            public string Info
            {
                get { return url.ActionSeo("Info", "Template"); }
            }

            public string Update
            {
                get { return url.ActionSeo("Update", "Template"); }
            }
        }

        #endregion

        #region Nested type: WidgetRoutes

        public class WidgetRoutes
        {
            protected UrlHelper url;

            public WidgetRoutes(UrlHelper url)
            {
                this.url = url;
            }

            public string Add
            {
                get { return url.ActionSeo("Add", "Widget"); }
            }

            public string Remove
            {
                get { return url.ActionSeo("Remove", "Widget"); }
            }

            public string Move
            {
                get { return url.ActionSeo("Move", "Widget"); }
            }

            public string Sort
            {
                get { return url.ActionSeo("Sort", "Widget"); }
            }
        }

        #endregion
    }
}