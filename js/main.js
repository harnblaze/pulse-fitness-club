/* =========================================================
   PULSE fitness club — интерактив
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const body = document.body;

  /* ---------- header: scroll state + active link ---------- */
  const header = $('.header');
  const toTop = $('.to-top');
  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 40);
    toTop?.classList.toggle('is-visible', y > 900);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  toTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const page = body.dataset.page;
  $$(`[data-nav="${page}"]`).forEach(a => {
    a.classList.add('is-active');
    a.setAttribute('aria-current', 'page');
  });

  /* ---------- mobile menu ---------- */
  const burger = $('.burger');
  const setMenu = open => {
    body.classList.toggle('is-menu-open', open);
    body.classList.toggle('is-locked', open);
    burger?.setAttribute('aria-expanded', String(open));
    burger?.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  };
  burger?.addEventListener('click', () => setMenu(!body.classList.contains('is-menu-open')));
  $$('.mobile-menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024 && body.classList.contains('is-menu-open')) setMenu(false);
  });

  /* ---------- reveal on scroll ---------- */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        revealIO.unobserve(e.target);
      }
    });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => revealIO.observe(el));

  /* ---------- counters ---------- */
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const dur = 1600;
      const start = performance.now();
      const tick = now => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString('ru-RU') + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countIO.unobserve(el);
    });
  }, { threshold: .5 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- toast ---------- */
  const toast = $('.toast');
  let toastTimer;
  const showToast = text => {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
  };

  /* ---------- modal ---------- */
  const modal = $('#modal');
  let lastFocus = null;
  const openModal = (preset = {}) => {
    if (!modal) return;
    lastFocus = document.activeElement;
    const form = $('form', modal);
    form.hidden = false;
    form.reset();
    $$('.field', form).forEach(f => f.classList.remove('is-invalid'));
    $('.form-success', modal).classList.remove('is-visible');
    $('.modal__head', modal).hidden = false;
    if (preset.direction) {
      const select = $('select[name="direction"]', form);
      const opt = [...select.options].find(o => o.value === preset.direction || o.text === preset.direction);
      if (opt) select.value = opt.value;
    }
    const extra = $('input[name="extra"]', form);
    if (extra) extra.value = preset.extra || '';
    const title = $('#modal-title', modal);
    title.textContent = preset.title || 'Первая тренировка — за наш счёт';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    body.classList.add('is-locked');
    setTimeout(() => $('input[name="name"]', form)?.focus(), 350);
  };
  const closeModal = () => {
    if (!modal?.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (!body.classList.contains('is-menu-open')) body.classList.remove('is-locked');
    lastFocus?.focus?.();
  };
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-modal]');
    if (trigger) {
      e.preventDefault();
      openModal({
        direction: trigger.dataset.direction,
        title: trigger.dataset.title,
        extra: trigger.dataset.extra,
      });
    }
    if (e.target.closest('[data-modal-close]')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); setMenu(false); }
  });

  /* ---------- phone mask ---------- */
  const formatPhone = value => {
    let d = value.replace(/\D/g, '');
    if (!d) return '';
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    let out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ')';
    if (d.length > 4) out += ' ' + d.slice(4, 7);
    if (d.length > 7) out += '-' + d.slice(7, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    return out;
  };
  document.addEventListener('input', e => {
    if (e.target.matches('input[type="tel"]')) {
      e.target.value = formatPhone(e.target.value);
      e.target.closest('.field')?.classList.remove('is-invalid');
    } else if (e.target.closest('.field')) {
      e.target.closest('.field').classList.remove('is-invalid');
    }
  });
  document.addEventListener('focusin', e => {
    if (e.target.matches('input[type="tel"]') && !e.target.value) e.target.value = '+7 (';
  });
  document.addEventListener('focusout', e => {
    if (e.target.matches('input[type="tel"]') && e.target.value.replace(/\D/g, '').length <= 1) e.target.value = '';
  });

  /* ---------- form validation + submit handling ---------- */
  const validate = form => {
    let ok = true;
    $$('[required]', form).forEach(input => {
      const field = input.closest('.field');
      let valid = true;
      if (input.type === 'checkbox') valid = input.checked;
      else if (input.type === 'tel') valid = input.value.replace(/\D/g, '').length === 11;
      else valid = input.value.trim().length >= 2;
      if (!valid) {
        ok = false;
        field?.classList.add('is-invalid');
        if (input.type === 'checkbox') showToast('Подтвердите согласие на обработку данных');
      }
    });
    if (!ok) $('.is-invalid input, .is-invalid select, .is-invalid textarea', form)?.focus();
    return ok;
  };

  $$('form[data-form]').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!validate(form)) return;
      const btn = $('button[type="submit"]', form);
      const label = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Отправляем…';
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = label;
        const wrap = form.closest('[data-form-wrap]');
        const success = wrap && $('.form-success', wrap);
        if (success) {
          form.hidden = true;
          const head = $('.modal__head', wrap);
          if (head) head.hidden = true;
          success.classList.add('is-visible');
        } else {
          showToast('Спасибо! Мы свяжемся с вами в ближайшее время');
          form.reset();
        }
      }, 900);
    });
  });

  /* ---------- quiz (home hero) ---------- */
  const quiz = $('.quiz');
  if (quiz) {
    const steps = $$('.quiz__step', quiz);
    const bar = $('.quiz__progress span', quiz);
    const label = $('.quiz__current', quiz);
    const answers = {};
    const recs = {
      'Похудеть': 'функционального тренинга, сайкла и бассейна',
      'Набрать массу': 'тренажёрного зала с персональным тренером',
      'Здоровая спина': 'пилатеса и йоги',
      'Снять стресс': 'йоги, бассейна и бокса',
    };
    const go = i => {
      steps.forEach((s, n) => s.classList.toggle('is-active', n === i));
      bar.style.width = `${((i + 1) / steps.length) * 100}%`;
      label.textContent = i + 1;
    };
    quiz.addEventListener('click', e => {
      const opt = e.target.closest('.quiz__option');
      if (!opt) return;
      const step = opt.closest('.quiz__step');
      const idx = steps.indexOf(step);
      $$('.quiz__option', step).forEach(o => o.classList.remove('is-selected'));
      opt.classList.add('is-selected');
      answers[step.dataset.key] = opt.dataset.value;
      setTimeout(() => {
        if (idx === steps.length - 2) {
          $('.quiz__rec', quiz).textContent = recs[answers.goal] || 'пробной тренировки с тренером';
          $('.quiz__level', quiz).textContent = answers.level.toLowerCase();
          $('input[name="extra"]', quiz).value = `Цель: ${answers.goal}; уровень: ${answers.level}`;
        }
        go(idx + 1);
      }, 280);
    });
    $('.quiz__back', quiz)?.addEventListener('click', () => go(0));
  }

  /* ---------- slider ---------- */
  $$('[data-slider]').forEach(slider => {
    const track = $('.slider__track', slider);
    const prev = $('[data-prev]', slider);
    const next = $('[data-next]', slider);
    const step = () => track.firstElementChild.getBoundingClientRect().width + 24;
    const update = () => {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* ---------- countdown ---------- */
  const cd = $('[data-countdown]');
  if (cd) {
    const end = new Date(cd.dataset.countdown).getTime();
    const cells = {
      d: $('[data-d]', cd), h: $('[data-h]', cd), m: $('[data-m]', cd), s: $('[data-s]', cd),
    };
    const pad = n => String(n).padStart(2, '0');
    const tick = () => {
      let diff = Math.max(0, end - Date.now());
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      cells.d.textContent = pad(d); cells.h.textContent = pad(h);
      cells.m.textContent = pad(m); cells.s.textContent = pad(s);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- directions filter ---------- */
  const programs = $$('.program[data-goals]');
  $$('[data-filter-group="goals"] .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('[data-filter-group="goals"] .chip').forEach(c => c.classList.toggle('is-active', c === chip));
      const f = chip.dataset.filter;
      programs.forEach(p => {
        const show = f === 'all' || p.dataset.goals.split(' ').includes(f);
        p.classList.toggle('is-hidden', !show);
      });
    });
  });

  /* ---------- FAQ ---------- */
  $$('.faq__q').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.closest('.faq__item');
      const open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      q.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- pricing toggle ---------- */
  const billing = $('.billing');
  if (billing) {
    const fmt = n => n.toLocaleString('ru-RU');
    const setBilling = mode => {
      $$('button', billing).forEach(b => {
        const active = b.dataset.billing === mode;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      $$('.plan').forEach(plan => {
        const month = +plan.dataset.month;
        const yearly = Math.round(month * .75 / 10) * 10;
        $('.plan__price b', plan).textContent = fmt(mode === 'year' ? yearly : month);
        $('.plan__old', plan).textContent = mode === 'year'
          ? `${fmt(month)} ₽/мес · ${fmt(yearly * 12)} ₽ за год`
          : '';
      });
    };
    billing.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b) setBilling(b.dataset.billing);
    });
    setBilling('month');
  }

  /* ---------- schedule ---------- */
  const scheduleRoot = $('#schedule');
  if (scheduleRoot) {
    const CLASSES = [
      { name: 'Утренний HIIT', cat: 'cardio', coach: 'Артём Волков', room: 'Студия 1', dur: 45, lvl: 2 },
      { name: 'Хатха-йога', cat: 'mind', coach: 'Елена Ким', room: 'Студия Mind', dur: 60, lvl: 1 },
      { name: 'Пилатес на матах', cat: 'mind', coach: 'Елена Ким', room: 'Студия Mind', dur: 55, lvl: 1 },
      { name: 'Сайкл', cat: 'cardio', coach: 'Артём Волков', room: 'Сайкл-студия', dur: 50, lvl: 2 },
      { name: 'Силовой тренинг', cat: 'power', coach: 'Дмитрий Орлов', room: 'Зал', dur: 60, lvl: 2 },
      { name: 'Ягодицы и пресс', cat: 'power', coach: 'Анна Смирнова', room: 'Студия 2', dur: 55, lvl: 1 },
      { name: 'Кроссфит', cat: 'power', coach: 'Дмитрий Орлов', room: 'Функц. зона', dur: 60, lvl: 3 },
      { name: 'Аквааэробика', cat: 'pool', coach: 'Ольга Лебедева', room: 'Бассейн', dur: 45, lvl: 1 },
      { name: 'Плавание для взрослых', cat: 'pool', coach: 'Ольга Лебедева', room: 'Бассейн', dur: 45, lvl: 1 },
      { name: 'Бокс', cat: 'fight', coach: 'Артём Волков', room: 'Ринг', dur: 60, lvl: 2 },
      { name: 'Кикбоксинг', cat: 'fight', coach: 'Артём Волков', room: 'Ринг', dur: 60, lvl: 3 },
      { name: 'Детская гимнастика', cat: 'kids', coach: 'Анна Смирнова', room: 'Детская студия', dur: 45, lvl: 1 },
      { name: 'Виньяса-флоу', cat: 'mind', coach: 'Елена Ким', room: 'Студия Mind', dur: 75, lvl: 2 },
      { name: 'Табата', cat: 'cardio', coach: 'Анна Смирнова', room: 'Студия 1', dur: 30, lvl: 3 },
    ];
    const CAT_LABEL = { power: 'Силовые', cardio: 'Кардио', mind: 'Mind & Body', pool: 'Бассейн', fight: 'Единоборства', kids: 'Детям' };
    const LVL_LABEL = ['', 'Новичок', 'Средний', 'Продвинутый'];
    const SLOTS = ['07:00', '08:00', '09:30', '11:00', '12:30', '16:00', '17:30', '18:30', '19:30', '20:30', '21:30'];
    const WEEKEND_SLOTS = ['09:00', '10:30', '12:00', '13:30', '16:00', '17:30'];

    // детерминированный «рандом», чтобы расписание не прыгало
    const rnd = seed => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };
    const buildDay = dow => {
      const slots = dow >= 5 ? WEEKEND_SLOTS : SLOTS;
      return slots.flatMap((time, i) => {
        const count = rnd(dow * 31 + i) > .55 ? 2 : 1;
        return Array.from({ length: count }, (_, k) => {
          const c = CLASSES[Math.floor(rnd(dow * 97 + i * 13 + k * 7) * CLASSES.length)];
          const total = c.cat === 'pool' ? 12 : 20;
          const left = Math.floor(rnd(dow * 17 + i * 5 + k) * (total + 1));
          return { ...c, time, total, left, id: `${dow}-${i}-${k}` };
        });
      }).filter((c, i, arr) => arr.findIndex(x => x.time === c.time && x.room === c.room) === i);
    };

    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const daysEl = $('.days', scheduleRoot);
    const listEl = $('.classes', scheduleRoot);
    const today = new Date();
    const todayDow = (today.getDay() + 6) % 7;
    const monday = new Date(today); monday.setDate(today.getDate() - todayDow);
    const booked = new Set();
    let state = { day: todayDow, cat: 'all', lvl: 'all' };

    daysEl.innerHTML = dayNames.map((n, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const label = i === todayDow ? 'Сегодня' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
      return `<button class="day" type="button" data-day="${i}"><b>${n}</b><span>${label}</span></button>`;
    }).join('');

    const endTime = (t, dur) => {
      const [h, m] = t.split(':').map(Number);
      const total = h * 60 + m + dur;
      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };

    const render = () => {
      $$('.day', daysEl).forEach(b => b.classList.toggle('is-active', +b.dataset.day === state.day));
      const items = buildDay(state.day)
        .filter(c => state.cat === 'all' || c.cat === state.cat)
        .filter(c => state.lvl === 'all' || String(c.lvl) === state.lvl);
      if (!items.length) {
        listEl.innerHTML = '<div class="classes__empty">В это время мы отдыхаем, чтобы завтра заряжать вас энергией. Выберите другой день или фильтр 💪</div>';
        return;
      }
      listEl.innerHTML = items.map((c, i) => {
        const isBooked = booked.has(c.id);
        const full = c.left === 0 && !isBooked;
        const spots = full ? 'Мест нет' : `Свободно ${isBooked ? c.left - 1 : c.left} из ${c.total}`;
        const low = c.left <= 3;
        return `
          <article class="class-row" style="animation-delay:${i * 40}ms">
            <div class="class-row__time">${c.time}<small>до ${endTime(c.time, c.dur)} · ${c.dur} мин</small></div>
            <div>
              <div class="class-row__name">${c.name}</div>
              <span class="class-row__cat">${CAT_LABEL[c.cat]}</span>
            </div>
            <div class="class-row__info class-row__info--trainer"><b>${c.coach}</b>${c.room}</div>
            <div class="class-row__info class-row__info--level">
              <b>${LVL_LABEL[c.lvl]}</b>
              <span class="level">${[1, 2, 3].map(n => `<i class="${n <= c.lvl ? 'on' : ''}"></i>`).join('')}</span>
              <div class="class-row__spots ${low ? 'is-low' : ''}">${spots}</div>
            </div>
            <button class="btn btn--sm ${isBooked ? 'is-booked' : ''}" type="button" data-book="${c.id}" data-name="${c.name}" data-time="${c.time}">
              ${isBooked ? 'Вы записаны ✓' : full ? 'В лист ожидания' : 'Записаться'}
            </button>
          </article>`;
      }).join('');
    };

    daysEl.addEventListener('click', e => {
      const b = e.target.closest('.day');
      if (b) { state.day = +b.dataset.day; render(); }
    });
    $$('[data-sched-filter]', scheduleRoot).forEach(group => {
      group.addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        $$('.chip', group).forEach(c => c.classList.toggle('is-active', c === chip));
        state[group.dataset.schedFilter] = chip.dataset.value;
        render();
      });
    });
    listEl.addEventListener('click', e => {
      const b = e.target.closest('[data-book]');
      if (!b) return;
      const id = b.dataset.book;
      if (booked.has(id)) {
        booked.delete(id);
        showToast('Запись отменена');
      } else if (b.textContent.trim() === 'В лист ожидания') {
        showToast(`Вы в листе ожидания на «${b.dataset.name}». Сообщим, если место освободится`);
        return;
      } else {
        booked.add(id);
        showToast(`Вы записаны на «${b.dataset.name}» в ${b.dataset.time}`);
      }
      render();
    });
    render();
  }

  /* ---------- year in footer ---------- */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
