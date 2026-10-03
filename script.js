(function () {
        "use strict";
        var ids = [
            "result",
            "reveal",
            "copy",
            "bar",
            "strength",
            "entropy",
            "generate",
            "batchButton",
            "message",
            "length",
            "lengthValue",
            "lower",
            "upper",
            "digits",
            "symbols",
            "ambiguous",
            "passwordControls",
            "phraseControls",
            "words",
            "wordValue",
            "separator",
            "capitalize",
            "suffix",
            "batch",
            "batchList",
          ],
          e = {};
        ids.forEach(function (x) {
          e[x] = document.getElementById(x);
        });
        var KEY = "cipherforge:preferences:v1",
          mode = "password",
          hidden = false,
          current = "",
          sets = {
            lower: "abcdefghijklmnopqrstuvwxyz",
            upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            digits: "0123456789",
            symbols: "!@#$%^&*()-_=+[]{};:,.?",
          },
          ambiguous = "0O1lI|",
          words =
            "amber anchor apricot arrow atlas aurora bamboo beacon berry bloom breeze brook canyon cedar cherry cipher cobalt comet coral cosmos crystal dawn delta drift echo ember falcon fern flame forest frost garden glacier harbor hazel horizon indigo island jade jasmine juniper lagoon lantern lemon lilac lunar maple marble meadow meteor mint mist nebula night north oasis ocean olive onyx orbit orchid pearl pepper petal pine pixel plum prism quartz raven reef river rose saffron sage shadow silver solar spark stone storm summit sunset terra thunder tiger timber topaz valley velvet violet wave willow winter zephyr".split(
              " ",
            );
        function random(max) {
          var limit = Math.floor(4294967296 / max) * max,
            a = new Uint32Array(1);
          do {
            crypto.getRandomValues(a);
          } while (a[0] >= limit);
          return a[0] % max;
        }
        function shuffle(a) {
          for (var i = a.length - 1; i > 0; i--) {
            var j = random(i + 1),
              x = a[i];
            a[i] = a[j];
            a[j] = x;
          }
          return a;
        }
        function store() {
          try {
            localStorage.setItem(
              KEY,
              JSON.stringify({
                length: e.length.value,
                lower: e.lower.checked,
                upper: e.upper.checked,
                digits: e.digits.checked,
                symbols: e.symbols.checked,
                ambiguous: e.ambiguous.checked,
                words: e.words.value,
                separator: e.separator.value,
                capitalize: e.capitalize.checked,
                suffix: e.suffix.checked,
              }),
            );
          } catch (x) {}
        }
        function restore() {
          try {
            var p = JSON.parse(localStorage.getItem(KEY) || "{}");
            Object.keys(p).forEach(function (k) {
              if (!e[k]) return;
              if (e[k].type === "checkbox") e[k].checked = !!p[k];
              else e[k].value = p[k];
            });
          } catch (x) {}
          labels();
        }
        function labels() {
          e.lengthValue.textContent = e.length.value;
          e.wordValue.textContent = e.words.value;
        }
        function makePassword() {
          var names = Object.keys(sets).filter(function (k) {
            return e[k].checked;
          });
          if (!names.length) throw Error("Select at least one character type.");
          var pools = names.map(function (k) {
              return sets[k].split("").filter(function (c) {
                return !e.ambiguous.checked || ambiguous.indexOf(c) < 0;
              });
            }),
            out = pools.map(function (p) {
              return p[random(p.length)];
            }),
            all = pools.join("");
          while (out.length < +e.length.value)
            out.push(all[random(all.length)]);
          return shuffle(out).join("");
        }
        function makePhrase() {
          var out = [];
          while (out.length < +e.words.value) {
            var w = words[random(words.length)];
            if (out.indexOf(w) < 0)
              out.push(
                e.capitalize.checked ? w[0].toUpperCase() + w.slice(1) : w,
              );
          }
          return (
            out.join(e.separator.value) +
            (e.suffix.checked ? String(random(90) + 10) : "")
          );
        }
        function estimate(v) {
          var bits;
          if (mode === "password") {
            var pool = 0;
            Object.keys(sets).forEach(function (k) {
              if (e[k].checked)
                pool += sets[k].split("").filter(function (c) {
                  return !e.ambiguous.checked || ambiguous.indexOf(c) < 0;
                }).length;
            });
            bits = Math.floor(Math.log2(Math.max(1, pool)) * v.length);
          } else
            bits = Math.floor(
              Math.log2(words.length) * +e.words.value +
                (e.suffix.checked ? Math.log2(90) : 0),
            );
          e.strength.textContent =
            bits < 45
              ? "Weak"
              : bits < 65
                ? "Fair"
                : bits < 90
                  ? "Strong"
                  : "Excellent";
          e.entropy.textContent = "≈ " + bits + " bits estimated";
          e.bar.style.width = Math.min(100, Math.max(12, bits / 1.15)) + "%";
        }
        function render() {
          e.result.textContent = hidden
            ? "•".repeat(Math.min(32, current.length))
            : current;
          e.reveal.textContent = hidden ? "◌" : "◉";
        }
        function message(s, bad) {
          e.message.textContent = s;
          e.message.style.color = bad ? "#ff9caf" : "#a7ebff";
          clearTimeout(message.timer);
          message.timer = setTimeout(function () {
            if (e.message.textContent === s) e.message.textContent = "";
          }, 2500);
        }
        function fresh(announce) {
          try {
            current = mode === "password" ? makePassword() : makePhrase();
            hidden = false;
            render();
            estimate(current);
            if (announce) message("Fresh result generated.");
            store();
          } catch (x) {
            message(x.message, true);
          }
        }
        async function copy(v) {
          try {
            await navigator.clipboard.writeText(v);
            message("Copied to clipboard.");
          } catch (x) {
            message("Clipboard blocked — select and copy manually.", true);
          }
        }
        document.querySelectorAll("[data-mode]").forEach(function (b) {
          b.onclick = function () {
            mode = b.dataset.mode;
            document.querySelectorAll("[data-mode]").forEach(function (x) {
              x.classList.toggle("active", x === b);
            });
            e.passwordControls.hidden = mode !== "password";
            e.phraseControls.hidden = mode !== "passphrase";
            e.batch.hidden = true;
            fresh(false);
          };
        });
        [e.length, e.words].forEach(function (x) {
          x.oninput = function () {
            labels();
            fresh(false);
          };
        });
        [
          e.lower,
          e.upper,
          e.digits,
          e.symbols,
          e.ambiguous,
          e.separator,
          e.capitalize,
          e.suffix,
        ].forEach(function (x) {
          x.onchange = function () {
            fresh(false);
          };
        });
        e.generate.onclick = function () {
          fresh(true);
        };
        e.copy.onclick = function () {
          copy(current);
        };
        e.reveal.onclick = function () {
          hidden = !hidden;
          render();
        };
        e.batchButton.onclick = function () {
          e.batchList.innerHTML = "";
          for (var i = 0; i < 5; i++) {
            (function (v) {
              var row = document.createElement("div"),
                text = document.createElement("span"),
                button = document.createElement("button");
              row.className = "batch-row";
              text.textContent = v;
              button.textContent = "⧉";
              button.onclick = function () {
                copy(v);
              };
              row.append(text, button);
              e.batchList.append(row);
            })(mode === "password" ? makePassword() : makePhrase());
          }
          e.batch.hidden = false;
          e.batch.scrollIntoView({
            behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
              ? "auto"
              : "smooth",
          });
        };
        if (!window.crypto || !crypto.getRandomValues) {
          message("Secure random generation is unavailable.", true);
          return;
        }
        restore();
        fresh(false);
      })();
