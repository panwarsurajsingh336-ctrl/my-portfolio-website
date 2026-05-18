const ejs = require("ejs");
const path = require("path");

const viewDir = path.join(__dirname, "..", "views");

const pages = [
  ["index", { title: "Suraj Singh - MERN Stack Developer", page: "home" }],
  ["about", { title: "About - Suraj Singh", page: "about" }],
  ["skills", { title: "Skills - Suraj Singh", page: "skills" }],
  ["projects", { title: "Projects - Suraj Singh", page: "projects" }],
  ["resume", { title: "Resume - Suraj Singh", page: "resume" }],
  [
    "contact",
    {
      title: "Contact - Suraj Singh",
      page: "contact",
      success: false,
      error: false,
      formData: {},
    },
  ],
];

async function validate() {
  for (const [view, data] of pages) {
    await ejs.renderFile(path.join(viewDir, `${view}.ejs`), data);
  }

  require("../server");
  console.log(`Rendered ${pages.length} pages and loaded the server successfully.`);
}

validate().catch((error) => {
  console.error(error);
  process.exit(1);
});
