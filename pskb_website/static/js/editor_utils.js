var MARKDOWN_TUTORIAL = "\
# Markdown tutorial by example\
\n\n\
Read this if you need to check the Markdown syntax. \n\n\
\
> **Disable the live tutorial to go back to your article**.\n\
\
\n\n\n\
# Headers \
\n\n\
## Header's Subsection \
\n\n\
### Header's Subsection \
\n\n\
#### Header's Subsection \
\n\n\
##### Header's Subsection \
\n\n\n\
# Text Format \
\n\n\
normal, *italic*, **bold**, __bold__, _emphasis_, ~~strikethrough~~, ùníçõd&, `code`, \*escaping special chars\*, &copy; \
\n\n\
## Bloquote \
\n\n\
> You can put some warning or important messages in blockquotes. \n\
Check that a blockquote can have multiple lines. \
\n\n\n\
# Code \
\n\n\
```\n\
print('test')\n\
```\
\n\n\
```javascript\n\
$(function(){\n\
  $('div').html('I am a div.');\n\
});\n\
```\
\n\n\n\
# Lists\
\n\n\
## Unordered list\
\n\n\
- item 1\n\
- item 2\n\
\n\
or\n\
\n\
* item 1\n\
* item 2\
\n\n\
## Ordered list\
\n\n\
1. item 1\n\
1. item 2\n\
\n\
or\n\
\n\
1. item 1\n\
2. item 2\n\
\n\
## Nesting\
\n\n\
1. item 1\n\
  1. item 1.1\n\
  2. item 1.2\n\
    - subitem 1\n\
    - subitem 2\n\
2. item 2\n\
\n\
## Task Listing\
\n\n\
- [ ] item 1\n\
- [x] item 2\n\
\n\n\
# Tables\
\n\n\
First Column Header | Second Column Header | Third Column\n\
------------------- | -------------------- | ------------\n\
Content from cell 1 | | Content from cell 3\n\
Another cell 1 | Another cell 2\n\
\n\n\
# Links\
\n\n\
* [text of the link](http://hackguides.org)\n\
* http://hackguides.org\
\n\n\n\
# Images and Files\
\n\n\
![alt text](http://tutorials.pluralsight.com/static/img/dark-logo.png 'Logo Title')\
\n\n\n\
# Horizontal rules\
\n\n\
------------------------\
\n\n\
or\
\n\n\
* * *\
\n\n\
or\
\n\n\
*****\
\n\n\
";

// Article data
var editor;
var author_name;
var author_real_name;
// Auto-save
var current_local_filename;
var autosaveEnabled = true;
// Preview
var preview = null;
var editor_wrapper = null;
// Markdown tutorial
var liveTutorialEnabled = false;
// Scroll Sync
var scrollSyncEnabled = false;
// Virtual DOM
var vdom = window.virtualDom
var html2vtree = window.vdomParser;
var currentVTree = null;
var previewRootDomNode = null;

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

var updatePreview = function() {
    var newHtml = marked(editor.getSession().getValue())
    newVTree = html2vtree('<div id="previewWrapper" class="previewWrapper">' + newHtml + '</div>')

    if (! currentVTree) {
        currentVTree = newVTree
        previewRootDomNode = vdom.create(currentVTree)
        preview.appendChild(previewRootDomNode);
    }

    var patches = vdom.diff(currentVTree, newVTree);
    previewRootDomNode = vdom.patch(previewRootDomNode, patches);
    currentVTree = newVTree;
    scrollPreviewAccordingToEditor()
};


var loadAutoSave = function(local_filename) {
    var obj = localStorage.getItem('hack.guides');
    if (obj) {
        obj = JSON.parse(obj);
        return obj[local_filename]; // markdown content or undefined
    }
    return undefined;
}

var autoSave = function(local_filename) {
    var content_as_markdown = editor.getSession().getValue();
    var obj = localStorage.getItem('hack.guides') || '{}';
    obj = JSON.parse(obj);
    obj[local_filename] = content_as_markdown;
    localStorage.setItem('hack.guides', JSON.stringify(obj));
};

var clearLocalSave = function(local_filename) {
    var obj = localStorage.getItem('hack.guides');
    if (obj) {
        obj = JSON.parse(obj);
        delete obj[local_filename];
        localStorage.setItem('hack.guides', JSON.stringify(obj));
    }
    return undefined;
}

function initialize_editor(local_filename, content, name, real_name, img_upload_url) {
    author_name = name;
    author_real_name = real_name;
    current_local_filename = local_filename;

    preview = document.getElementById('preview');
    editor_wrapper = document.getElementById('editor-wrapper');
    toggleScrollSync(); // enable auto sync

    editor = ace.edit("editor");
    editor.setTheme("ace/theme/github");
    editor.getSession().setMode("ace/mode/markdown");
    editor.getSession().setUseWrapMode(true);
    editor.getSession().setNewLineMode("unix");

    editor.$blockScrolling = Infinity;

    editor.setShowPrintMargin(false);
    editor.renderer.setShowGutter(true);
    editor.renderer.setOption('showLineNumbers', true);

    editor.commands.addCommand({
        name: 'fullscreen',
        bindKey: {win: 'Ctrl-F',  mac: 'Command-F'},
        exec: function(editor) {
            toggleFullscreenMode();
            $("#btn-fullscreen-mode").toggleClass('active');
        }
    });

    marked.setOptions({
      gfm: true,
      tables: true,
      breaks: true,
      pedantic: false,
      sanitize: false,
      smartLists: true,
      smartypants: false
    });

    var placeholder = '# Start writing your guide here.\n\nOr load the live markdown tutorial to check the syntax.';
    var local_content = loadAutoSave(local_filename);
    // local content should always be the same or the most updated version.
    editor.setValue(local_content || content || placeholder);
    editor.gotoLine(1);
    updatePreview();

    if (content && ! local_content) {
        autoSave(local_filename);
    }

    editor.getSession().on('change', debounce(updatePreview, 200));
    editor.getSession().on('change', debounce(function() {
        if (autosaveEnabled) {
            autoSave(local_filename);
        }
    }, 1000));

    editor.getSession().on('changeScrollTop', function(scrollTop) {
        scrollPreviewAccordingToEditor(scrollTop)
    })

    configure_dropzone_area(img_upload_url);

    return editor;
}

function getAceEditorScrollHeight() {
    var r = editor.renderer
    return r.layerConfig.maxHeight - r.$size.scrollerHeight + r.scrollMargin.bottom
}

function configure_dropzone_area(img_upload_url) {
    Dropzone.autoDiscover = false;
    var dropZoneOptions = {
        url: img_upload_url,
        paramName: 'file',
        maxFilesize: 3, // MB
        uploadMultiple: false,
        disablePreview: false,
        createImageThumbnails: false,
        addRemoveLinks: false,
        previewTemplate: document.querySelector('#preview-template').innerHTML,
        clickable: '.btn-dropzone',
        accept: function(file, done) {
            if (file.name.endsWith('.exe') || file.name.endsWith('.bin') || file.name.endsWith('.bat')) {
                done("File not supported");
            }
            else {
                done();
            }
        }
    };
    var myDropzone = new Dropzone("div#droppable-area", dropZoneOptions);
    myDropzone.on('success', function(file, path) {
        // Add Markdown reference into the editor
        var fileMarkdown = '\n![description](' + path + ')\n';
        editor.insert(fileMarkdown);
    });

    myDropzone.on("complete", function(file) {
        myDropzone.removeFile(file);
    });

    return myDropzone;
}

function openLiveMarkdownTutorial() {
    autosaveEnabled = false;
    editor.getSession().setValue(MARKDOWN_TUTORIAL);
    $('.btn-save').prop('disabled', true);
}

function closeLiveMarkdownTutorial() {
    editor.setValue(loadAutoSave(current_local_filename) || '');
    autosaveEnabled = true;
    $('.btn-save').prop('disabled', false);
}

function toggleLiveTutorial() {
    if (liveTutorialEnabled) {
        closeLiveMarkdownTutorial();
    } else {
        openLiveMarkdownTutorial();
    }
    liveTutorialEnabled = ! liveTutorialEnabled;
}

function scrollPreviewAccordingToEditor(scrollTop) {
    if (scrollSyncEnabled) {
        scrollTop = scrollTop || editor.session.getScrollTop()
        var editorHeight = getAceEditorScrollHeight()
        var percentage = scrollTop / editorHeight

        preview.scrollTop = Math.round(percentage * (preview.scrollHeight - preview.offsetHeight))
    }
}

function scrollEditorAccordingToPreview() {
    $(preview).off('scroll')

    var percentage = this.scrollTop / (this.scrollHeight - this.offsetHeight)

    var editorHeight = getAceEditorScrollHeight()
    var position = Math.round(percentage * editorHeight)
    editor.getSession().setScrollTop(position)

    setTimeout(function() { $(preview).on('scroll', scrollEditorAccordingToPreview); }, 10);
}

function toggleScrollSync() {
    if (scrollSyncEnabled) {
        $(preview).off('scroll', scrollEditorAccordingToPreview);
    } else {
        $(preview).on('scroll', scrollEditorAccordingToPreview);
    }
    scrollSyncEnabled = ! scrollSyncEnabled;
}

var isFullscreenEnabled = false;

function closeFullscreen() {
    $('html, body').removeClass('body-fs');
    isFullscreenEnabled = false;
}
function openFullscreen() {
    $('html, body').addClass('body-fs');
    isFullscreenEnabled = true;
}

function toggleFullscreenMode() {
    if (isFullscreenEnabled) {
        closeFullscreen();
    } else {
        openFullscreen();
    }
}

var clearFlashMessages = function(message, clazz) {
    $('.bg-info, .bg-warning, .bg-danger').remove();
};

var addFlashMessage = function(message, clazz) {
    var msg = '<p class="' + (clazz || 'bg-info') + '">' + message + '</p>';
    $('.flash-msgs').append(msg);
};

function save(sha, path, secondary_repo) {
    clearFlashMessages();
    $('.btn-save').prop('disabled', true);
    var data = {
        'title': $('input[name=title]').val(),
        'original_stack': $('input[name=original_stack]').val(),
        'stacks': $('#stacks').val(),
        'content': editor.getSession().getValue(),
        'sha': sha,
        'path': path
    }
    if (secondary_repo) {
        data['secondary_repo'] = 1;
    }
    $.ajax({
        type: 'POST',
        url: '/api/save/',
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
        data: data,
        dataType: 'json',
        cache: false,
        beforeSend: function(xhr) {
            $('html, body').css("cursor", "wait");
            return true;
        },
        complete: function(xhr, txt_status) {
            $('html, body').css("cursor", "auto");
        },
        success: function(data) {
            closeFullscreen();
            console.log(data);
            console.log(data.msg);
            clearLocalSave(current_local_filename);
            if (data.msg) {
                addFlashMessage(data.msg);
                $("html, body").animate({ scrollTop: 0 }, "fast");
                $('.btn-save').prop('disabled', false);
            }
            setTimeout(function(){ window.location.href = data.redirect; }, 1000);
        },
        error: function(response) {
            closeFullscreen();
            var status = response.status;
            var data = response.responseJSON;
            console.log(status, data);
            if (data && data.error) {
                addFlashMessage(data.error, 'bg-danger');
                $("html, body").animate({ scrollTop: 0 }, "fast");
                $('.btn-save').prop('disabled', false);
            }
            if (data && data.redirect) {
                setTimeout(function(){ window.location.href = data.redirect; }, 1000);
            } else {
                $('.btn-save').prop('disabled', false);
            }
        },
    });
}
