﻿using System.Text.RegularExpressions;

namespace EyePatch.Blog.Util.Extensions
{
    public static class StringExtensions
    {
        private static readonly Regex regexForPTags = new Regex(@"<p>\s*(.+)\s*</p>",
                                                       RegexOptions.Singleline | RegexOptions.Compiled);

        public static string TruncateWords(this string text, int wordCount)
        {
            var paragraphRegex = regexForPTags.Match(text);

            var output = string.Empty;
            var input = text;

            if (paragraphRegex.Success)
            {
                input = paragraphRegex.Groups[1].Value;
            }

            if (text.Length > 0)
            {
                var words = input.Split(' ');

                if (words.Length < wordCount)
                    wordCount = words.Length;

                for (var x = 0; x < wordCount; x++)
                    output += words[x] + " ";

                if (words.Length > wordCount)
                    output = output.Trim() + "...";
            }

            return output;
        }
    }
}