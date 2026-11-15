import React, { useMemo } from 'react';
import { View, Pressable } from 'react-native';
import RemoteImage from './RemoteImage';
import Icon from './Icon';
import { useColors } from '../store/themeStore';

const GAP = 4;

// شبكة صفوف متساوية الارتفاع بنسب الصور الحقيقية (بدون كروت)
function buildRows(items, width, target) {
  const rows = [];
  let cur = [];
  let sum = 0;
  items.forEach((m) => {
    const c = m.media[0];
    const r = c ? Math.min(Math.max(c.width / c.height, 0.6), 2.2) : 1;
    cur.push({ m, r });
    sum += r;
    const h = (width - GAP * (cur.length - 1)) / sum;
    if (h <= target) {
      rows.push({ items: cur, h });
      cur = [];
      sum = 0;
    }
  });
  if (cur.length) rows.push({ items: cur, h: Math.min(target, (width - GAP * (cur.length - 1)) / sum) });
  return rows;
}

export default function PhotoGrid({ memories, width, onPress, target = 150 }) {
  const C = useColors();
  const rows = useMemo(() => buildRows(memories, width, target), [memories, width, target]);
  return (
    <View style={{ gap: GAP }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: GAP }}>
          {row.items.map(({ m, r }) => (
            <Pressable key={m.id} onPress={() => onPress(m)} style={{ width: row.h * r, height: row.h }}>
              <RemoteImage id={m.media[0].id} style={{ width: '100%', height: '100%', borderRadius: 4 }} />
              {m.media.length > 1 ? (
                <View style={{ position: 'absolute', top: 6, left: 6 }}>
                  <Icon name="image" size={16} color={C.white} />
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
