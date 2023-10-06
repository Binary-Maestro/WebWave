let editor;
const ImageTool = window.ImageTool;
document.addEventListener("DOMContentLoaded", function () {
  editor = new EditorJS({
    tools: {
      header: Header,
      quote: Quote,
      image: {
        class: ImageTool,
        config: {
          field: "file",
          endpoints: {
            byFile: "http://localhost:3000/api/uploadFile", // Your backend file uploader endpoint
            byUrl: "http://localhost:8008/fetchUrl", // Your endpoint that provides uploading by Url
          },
        },
      },
      list: {
        class: NestedList,
        inlineToolbar: true,
        config: {
          defaultStyle: "unordered",
        },
      },
      checklist: {
        class: Checklist,
        inlineToolbar: true,
      },
      linkTool: {
        class: LinkTool,
        config: {
          endpoint: "http://localhost:3000/api/opengraph", // Your backend endpoint for url data fetching,
        },
      },
      embed: {
        class: Embed,
      },
      delimiter: Delimiter,
      warning: Warning,
      code: CodeTool,
      raw: RawTool,
      attaches: {
        class: AttachesTool,
        config: {
          endpoint: "http://localhost:3000/api/uploadFile",
        },
      },
      Marker: {
        class: Marker,
        shortcut: "ALT+M",
      },
      inlineCode: {
        class: InlineCode,
        shortcut: "ALT+C",
      },
    },
    holder: "wysiwyg",
  });

  document.querySelector(".publish").addEventListener("click", async () => {
    const edjsParser = edjsHTML();
    const data = await editor.save();
    const postData = {
      post_id: null,
      post_title: document.querySelector(".post_title").value,
      post_content: edjsParser.parse(data).join(""),
      author_id: 1,
    };
    console.log(postData);
    fetch("/api/create_post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        // Handle the response data here
        if (data.success === 1) {
          console.log("Post created successfully");
        } else {
          console.error("Failed to create post");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  });
  document.querySelector(".save_draft").addEventListener("click", () => {});
});
