Sup fellow uh... programmers i guess? This is sort of my first web app project, so before anything i just want to say sorry if my html or css or javascript is messy or is avoiding obviously easier alternatives, there's a good chance I just didn't find them when making the entire thing.

Right, if you're here just because you're wondering what this is, it's pretty much just a webpage that displays arcane odyssey island maps with little markers on them to... mark key things like chests, interactable things, you name it.
The webpage itself has a help tab that talks about the different things you can interact with in the page, but if you just want a general idea here's a list
- A tab with a full list of all the maps to select them and load them
- Support for maps with more than 1 image (you can scroll through them)
- Extra marker info when you hover over each one of them
- Support for toggling specific markers by clicking on the icon in the legend
- ...being able to zoom in? I don't know, i guess it's a feature
- A debug mode (usually turned off) that allows you to place/remove markers and export them as a json

If you're super curious about that "debug mode" by the way, currently there's not a way to toggle it in the live webpage, but if you really wanna mess around with it and make your own maps with custom markers and all you can try cloning the repository and turning it on on your own (it's just a variable named debugEnabled inside the code)

Okay well that's pretty much it for the surface level stuff that isnt super nerdy and about code, so if you don't want to read about... code or code structures, this is your warning.


Anyways, now i suppose i should talk about the structure of the project or how it works.
The entire webpage is pretty much just a big viewport where an image is shown and little elements are put on top of it (those being the markers). Internally the markers are a... sort of class? not really a class because they dont have much of a proper constructor or anything (if we're not counting the function that makes the html element) but still kind of a class. 
Anyways, the markers have an object structure as follows

{

	x -> X coordinate, (number from 0 to 1, basically a percentage)
	y -> Y coordiante (functionally identical to x but on the y axis)
	amnt -> the number that shows up on the marker (optional)
	note -> the text that shows up when the marker is hovered over (optional)
	id -> the id of the base marker "class" (if you could call it that), which is a string

}

Likewise, as you could guess from the "id" member, there are also what i would like to call the base marker classes, which define common information between markers of the same id.
They follow the following structure

{

	id -> self explanatory, identifier of the class, is a string
	legend -> the text that shows up on the legend of the maps
	supportsNumbers -> whether the marker allows for the amnt property to show (its wiped in initMarkers otherwise)
	color -> array of 3 numbers, each one corresponding to R,G and B (0-255)
	priority -> a number (optional), determines the order in which the markers show up in the legend, a higher number will make the marker show up higher. its assumed to be 0 if not specified
}

Any marker will have a base marker class as its prototype, given to it through the initMarkers function (because, as i said, i dont have a proper constructor for markers)
The base marker classes themselves can be found inside the markerInfo.json file, but maps can have a customMarkers member which works as a layer on top of that for overrides or extra markers that are non standard (more on that later)

Now, you might be wondering, "where the hell do you store the actual html element?", well its very simple. While the marker info itself does not have any place for the html element, when the markers are created (and placed inside the currLoadedMarkers array), they are wrapped within another object, this object basically serves as the link between the marker info and the html element, its structure is as follows:

{

	markerInfo -> self explanatory, the marker info we've been talking about
	element -> the html element (a div) that represents the marker

}

During runtime, then, the array that holds all markers will actually only hold these objects, not just the markerInfo. The main reason behind this is that markerInfo needs to be stored within the json for the maps, and so i felt it was more appropriate to not modify the original objects when loading that json, specially since maps are going to be potentially loaded and unloaded several times (without fetching the json again after the initial page load).


So, thats the marker structure done, now im going to tackle how maps are stored in their json

Maps have a bit more of a complicated structure, but they do not have prototypes, so theyre maybe a bit more straightforward.
Their structure is as follows:

{

	id -> similar to the id of the base marker classes, just an identificatory string
	index -> a number, it comes to play when a map has one or several sub maps, in which case several of these map structures are stored together in an array, this index being the index in that array
	name -> the text that will show on the legend as the main title, and as the title in the map selector
	category -> a string that groups together maps in the map selector, works as a sort of id
	legendPos -> a number, either 1 or 2, defines where the legend will be placed (1 = top left, 2 = top right)
	legendFSizeY -> the amount of pixels the header of the legend takes up on the Y axis
	markerSize -> the size of the marker in pixels (both in X and Y) (optional)
	imgPath -> self explanatory, the path to the image that is to be displayed when this map is loaded
	markers -> array with as many markerInfo objects as markers there are (do note it doesnt include their prototype)
	customMarkers -> (optional) has the same structure as the markerInfo.json file, markers will first look through this when initializing to set their proto (also these base markers have their proto set to the base markers in markerInfo.json, as to allow for overriding only certain properties)
	gatherable -> an array with strings, these show in a list under the "gatherable items" header in the legend
	sizeX -> size in pixels of the image on the X axis (we store that information in the json instead of just reading it off the file because we are not working directly with the file, we're just setting the src of the img element to it)
	sizeY -> size in pixels of the image on the Y axis

}

That pretty much sums up most of the things you would need to know about the structure of a map, though i should mention the maps that are comprised of more than one image. Those are just stored as an array with several of these map structures, being differentiated by their index (they keep the same id)

There's also a sort of debug mode, it just enables some html elements with buttons and text boxes to facilitate the process of placing markers with the correct amounts and notes, it can be enabled with the variable debugEnabled, which prevents the elements from being removed on site load.
Currently there is no way to load markers or "automatically" save them using debug mode, all you can do is press the export button which will paste a json of the markers onto a text area, allowing you to then paste it in the mapInfo.json file, but for my purposes that was enough as to be able to port the maps to the website.

Finally, i should mention one of the uhh... maybe more dubious parts of the project, which is the code that adjusts the map using its aspect ratio so that it perfectly fits to be as big as it can on the screen without overflowing.
In my approach, theres a function that given a size and an aspect will calculate the proper size in pixels for both x and y and apply it. In this function what the size parameter means will depend on a variable called scaleSmallest. If it's true, 1 unit of size will be equal to the smallest dimension, and if its false, 1 unit of size will be equal to the biggest dimension (you can think of it like a container query minimum or a container query maximum, but this one takes into account aspect ratio). The code has full compatibility to do both things, i believe it is up to personal preference as to what is better, having the image overflow but without weird margins, or having no overflow but with margins, which is why the behaviour can be switched with just 1 variable.

Anyways, i believe thats about all i have to say about this, if you have any doubts or anything feel free to reach out to me.