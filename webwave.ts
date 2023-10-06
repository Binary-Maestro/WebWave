import express from "express";
import ejs from "ejs";
import fs from "fs";
import path from "path";
import mysql, { Connection, Pool } from "mysql2/promise";
import bodyParser from "body-parser";
import { pool, testConnection } from "./db-config";
import multer from "multer";
import ogs from "open-graph-scraper";

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const port = 3000;
let currentTheme = "";

app.set("view engine", "ejs");

getAllSettings().then((setting: any) => {
  setting.forEach((key: any) => {
    if (key.setting_key == "default_theme") {
      currentTheme = key.setting_value;
      app.set("views", path.join(__dirname, `themes/${currentTheme}/views`));
      // Serve static files (CSS, JS, images)
      app.use(
        express.static(
          path.join(__dirname, `themes/${currentTheme}/views/assets`)
        )
      );
    }
  });
});

async function getMenu(): Promise<any[]> {
  const [rows]: any = await pool.query(`SELECT * FROM menu`);
  return rows;
}
async function getAllSettings(): Promise<any[]> {
  const [rows]: any = await pool.query(`SELECT * FROM settings`);
  return rows;
}
async function getAllPosts(): Promise<any[]> {
  const [rows]: any = await pool.query(`SELECT * FROM posts`);
  return rows;
}
// Middleware to load plugins
const plugins: any[] = [];
fs.readdirSync(path.join(__dirname, "plugins")).forEach((pluginFolder) => {
  const pluginPath = path.join(__dirname, "plugins", pluginFolder);
  const pluginInfoPath = path.join(pluginPath, "info.json");

  try {
    const pluginInfo = JSON.parse(fs.readFileSync(pluginInfoPath, "utf8"));
    const pluginFunction = require(path.join(pluginPath, "index")).default; // Import the default export
    const plugin = pluginFunction(); // Call the function to create the plugin object

    getMenu().then((allPages: any) => {
      plugin.apply(allPages);
      plugins.push({ pluginInfo, plugin });
    });
  } catch (error: any) {
    console.error(
      `Error loading plugin from ${pluginFolder}: ${error.message}`
    );
  }
});
// Serve custom CSS and JS files for the "/ww-admin" route
app.use(
  "/ww-admin/assets/css",
  express.static(path.join(__dirname, "adminpanel", "assets", "css"))
);
app.use(
  "/ww-admin/assets/js",
  express.static(path.join(__dirname, "adminpanel", "assets", "js"))
);
app.use(
  "/ww-admin/assets/images/favicon",
  express.static(
    path.join(__dirname, "adminpanel", "assets", "images", "favicon")
  )
);
app.use(
  "/ww-content/media",
  express.static(path.join(__dirname, "ww-content", "media"))
);
app.get("/ww-admin", async (req, res) => {
  const adminPanelPath = path.join(__dirname, "adminpanel", "adminpanel.ejs");
  res.render(adminPanelPath, {
    menuVisible: false,
  });
});
app.get("/ww-admin/dashboard", async (req, res) => {
  const adminPanelPath = path.join(__dirname, "adminpanel", "dashboard.ejs");
  res.render(adminPanelPath, {
    menuVisible: true,
  });
});
app.get("/ww-admin/newpost", async (req, res) => {
  const adminPanelPath = path.join(__dirname, "adminpanel", "newpost.ejs");
  res.render(adminPanelPath, {
    menuVisible: true,
  });
});
app.get("/ww-admin/editpost/:postid", async (req, res) => {
  const postId: any = req.params.postid;
  const adminPanelPath = path.join(__dirname, "adminpanel", "editpost.ejs");
  res.render(adminPanelPath, {
    menuVisible: true,
  });
});
app.get("/ww-admin/listposts", async (req, res) => {
  const adminPanelPath = path.join(__dirname, "adminpanel", "listposts.ejs");
  res.render(adminPanelPath, {
    menuVisible: true,
  });
});
app.post("/api/create_post", async (req, res) => {
  const sql = `INSERT INTO posts (post_id, post_title, post_content, author_id, post_date, post_edit_date, post_featured_image) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  var currentDate = new Date();
  const values = [
    req.body.post_id,
    req.body.post_title,
    req.body.post_content,
    req.body.author_id,
    Math.floor(currentDate.getTime() / 1000),
    null,
    null,
  ];

  try {
    await pool.query(sql, values);
    res.status(200).json({
      success: 1,
    });
  } catch (err: any) {
    console.error("Error executing sql query:", err.message);
    res.status(400).json({
      success: 0,
    });
  }
});
app.get("/api/opengraph", async (req: any, res: any) => {
  console.log(req.query.url);
  await fetchMetaData(req.query.url).then((metadata) => {
    res.status(200).json(metadata);
  });
});
getMenu().then(async (allPages: any) => {
  let postsPage: any = await getAllSettings();
  let pageTitle: any = await getAllSettings();
  let allPosts: any = await getAllPosts();
  pageTitle = pageTitle.find((x: any) => x.setting_key == "cms_title");
  allPosts.forEach((post: any) => {
    app.get(
      `/post/${encodeURIComponent(post.post_title)}`,
      async (req, res) => {
        res.render("post", {
          post: post,
          pages: allPages,
          title: `${pageTitle.setting_value} - ${post.post_title}`,
          theme: currentTheme,
        });
      }
    );
  });
  allPages.forEach((page: any) => {
    app.get(`/${page.slug}`, async (req, res) => {
      try {
        postsPage = postsPage.find((x: any) => x.setting_key == "page_posts");
        pageTitle = pageTitle.find((x: any) => x.setting_key == "cms_title");
      } catch {}

      if (page.type == "page") {
        page.slug = page.slug.startsWith("/") ? page.slug : `/${page.slug}`;
        res.render("page", {
          pageTitle: `${pageTitle.setting_value} - ${page.title}`,
          pages: allPages,
          enablePosts: postsPage?.setting_value == page.slug ? true : false,
          posts: allPosts,
          removeHtmlTags: removeHtmlTags,
          limitWords: limitWords,
          theme: currentTheme,
          curpage: page.title,
          content: page.content,
        });
      }
    });
  });
  // 404 handler
  app.use((req, res) => {
    res.status(404).render("error", {
      error_code: 404,
    });
  });
});
function limitWords(input: string, limit: number): string {
  const words = input.split(" ");

  if (words.length <= limit) {
    // If the input has fewer or equal words than the limit, return the original input.
    return input;
  } else {
    // If the input has more words than the limit, select the first "limit" words and join them.
    const limitedWords = words.slice(0, limit);
    return limitedWords.join(" ") + "[...]"; // You can add an ellipsis (...) to indicate truncation.
  }
}
function removeHtmlTags(input: string): string {
  // Regular expression to match HTML tags
  const regex = /<[^>]*>/g;
  // Use replace to remove HTML tags
  return input.replace(regex, "");
}

const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    // Specify the directory where uploaded files should be stored
    cb(null, "ww-content/media");
  },
  filename: (req: any, file: any, cb: any) => {
    // Specify the file name for the uploaded file
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });
app.post("/api/uploadFile", upload.single("file"), async (req: any, res) => {
  res.status(200).json({
    success: 1,
    file: {
      url: `http://localhost:3000/ww-content/media/${req.file.filename}`,
    },
  });
});
async function fetchMetaData(url: string): Promise<any> {
  try {
    const options = {
      url,
      timeout: 5000, // Adjust the timeout as needed
    };

    const { error, result } = await ogs(options);

    if (!error && result) {
      const { ogTitle, ogSiteName, ogDescription, ogImage } = result;

      // Extract the first image URL from the array, if available
      const imageUrl = ogImage && ogImage.length > 0 ? ogImage[0].url : null;
      return {
        success: 1,
        link: url, // Optionally return a link to set the hyperlink URL
        meta: {
          title: ogTitle,
          site_name: ogSiteName,
          description: ogDescription,
          image: {
            url: imageUrl,
          },
        },
      };
    } else {
      return {
        error: "Metadata not found",
      };
    }
  } catch (error) {
    return {
      error: "Error fetching metadata",
    };
  }
}

app.post("/api/login", async (req, res) => {
  const [rows]: any = await pool.query(
    `SELECT * FROM admins WHERE username='${req.body.username.toLowerCase()}'`
  );
  if (
    req?.body?.username == undefined ||
    req?.body?.password == undefined ||
    rows[0]?.password == undefined
  )
    return res.status(403).end(JSON.stringify({ status: "badrequest" }));
  if (req.body.password === rows[0].password) {
    return res.status(200).end(
      JSON.stringify({
        status: "ok",
      })
    );
  } else {
    return res.status(401).end(
      JSON.stringify({
        status: "failed",
      })
    );
  }
});

app.post("/api/save_draft", (req, res) => {});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
