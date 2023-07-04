Internationalization
====================

Panoptes is an internationalized application. At present we support four languages, english (en), spanish (es), italian (it) and turkish (tr). Some of the translations have been done professionally, but more recent ones have been done using Google Translate (https://translate.google.ca).

Steps to update the translations
--------------------------------

*Do NOT manually edit the yml files. They are now generated.*

* The master file is a spreadsheet called "Translations.xlsx".
* While adding a translation, the first step is to see if we already have the translation that you need. It may be that the work has been done but is not using the key that you are using. So, search the spreadsheet to see if a transation exists.
* If it already exists, then consider changing the key in your code to match the key that is already in the spreadsheet. If you can do this then you have no further work to do.
* If it doesn't exist, then add the entry to the spreadsheet.
* After adding the key and the english phrase, use Google Translate to create all of the spanish, italian, and turkish versions. Be sure that when you cut and paste the translations, that all the international characters appear properly in the spreadsheet.
* When done, finish by right clicking on "A" and selecting "Sort Ascending" so that the spreadsheet is sorted by the key. You may need to highlight the entire spreadsheet except for the unused translations at the bottom and then do the sorting. Save the spreadsheet.
* Build the yml files by running build.sh. Compare the yml files with previous versions to ensure your change is correct (using git diff).
* Refresh your browser (or rebuild panoptes if you are not in development mode) in order to see the effect of the changes.
* Commit your changes.

Note: If the phrase you want exists but doesn't have a key, then you can give it your key and check that all the necessary translations exist. Translations are expensive so they should never be deleted. If you are removing phrases from Panoptes, you can remove the key from the table so that it does not get populated in the YAML, but you should not remove the translation itself.

Note: Modern versions of Excel do seem to support "Unicode (UTF-8)" encoding properly, which is required for international text. The yml files are also generated with this encoding in mind. 
