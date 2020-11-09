MdCraft
=======

Craft html from markdown

## Installing

Install via NPM

```bash
npm install mdcraft
```

## Usage

Generate content in `content` to `dist` using `themes`.

```bash
npm run mdcraft craft
```

Run a local web server to serve content from `dist`.

```bash
npm run mdcraft server
```

## Getting Started

Project files are separated into **content** and **themes** folders.

All markdown files within `content` are parsed and generated into html files within `dist` using the theme specified. Any images, css or javascript within `content` are copied to dist preserving structure. 

```markdown
---
title: Green Eggs and Ham
theme: not-on-a-train
index-title: Sam I Am
index-description: I do not like greens and ham
---

## Green Eggs and Ham

I do not like green eggs and ham
```

In the above example the markdown content would be generated into html using the `not-on-a-train` theme.

## Metadata

File metadata is evaluated before output html files are generated.

Reserved metadata is defined below.

| Attribute | Values             | Purpose |
| --------- | ---------- | ------- |
| format    |            | **(default=md)** The format to interpret for processing. | 
|           | md         | Markdown is processed to html | 
|           | html       | No processing. Generated file using file contents (excluding metadata). |
|           | collection | All collections within the same folder are processed and generated into a single file |
| theme     | <string>   | (default=default)

### Wrapping Content

Useful in **collections**, the wrap attibute in metadata is used to include all content within a single html element with optional id or class attributes. This allows you to style sections separately.

```markdown
---
format: collection
wrap:
  id: foo
  class: bar
  element: main
---

## I do not like green eggs and ham

I do not like them sam I Am
```

The above content would be generated as

```html
<main id="foo" class="bar">
    <h2>I do not like greens and ham</h2>
    <p>I do not like them Sam I Am</p>
</main>
```

### API

API Generation allows for dynamic content querying.

| Attribute         | Values    | Purpose |
| ----------------- | --------- | ------- |
| index-title       | <string>  | title of content to be displayed in index and other services that consume content api |
| index-description | <string>  | description of content to be displayed in index and other services that consume content api |
| index-include     | <boolean> | (default=true) used to exclude content when index data is included. |

## Theming

Themes are stored within the `themes` folder. Themes are written in html allows for handlebars substitution. All themes are expected to have a `{{{content}}}` token to allow for generated content to be placed.

```hbs
<!doctype html>
<html class="no-js" lang="">

<head>
  <meta charset="utf-8">
  <title>{{title}}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <link rel="stylesheet" href="/themes/not-on-a-train/css/main.css">
</head>

<body>
{{{content}}}
</body>

</html>
```

In the above example, the title defined in content would be used to make the html title. Generated content is used within the html body.

## Additional Token Replacement

Themes can utilized any values included page metadata for token replacement. Some examples of common tokens include

| Attribute | Values   | Purpose |
| title     | <string> | If supplied, can be used to replace the {{title}} token in themes. Generally used to define page title and heading |
| subtitle  | <string> | Often used in sub-headings |

## Configuration

A limited number of settings (including module configuration) can be defined within `.mdcraft.config.json`.

```
{
  "server": {
    "port": 3001
  }
}
```
