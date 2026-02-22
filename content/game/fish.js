// FISH_TABLE、随机鱼生成逻辑

(()=>{
    // 确保 config 已加载（因为需要 FISH_TABLE）
    if (!window.HappyFishingConfig) {
        console.error('HappyFishingConfig 未加载，无法初始化鱼生成模块');
        return;
    }

    const { FISH_TABLE, getRandomInRange, getFishName} = window.HappyFishingConfig;

    // 计算总权重
    const TOTAL_WEIGHT = FISH_TABLE.reduce((sum, fish) => sum + (7 - fish.rarity), 0);

    // #region ==================== 选择一条鱼的种类 ====================
    /**
     * 根据稀有度加权随机选择一条鱼的种类
     * @returns {Object} 选中的鱼基础数据（name, rarity, weightMin, weightMax, ...） +++
     */
    const selectRandomFishType = () => {
        let random = Math.random() * TOTAL_WEIGHT;
        let accumulate = 0;

        for (const fish of FISH_TABLE) {
            accumulate += (7 - fish.rarity); // 稀有度越低， 权重越高
            if (random <= accumulate) {
                return fish;
            }
        }
        // 兜底， 默认返回最后一条鱼 (理论上不会走这里)
        return FISH_TABLE[FISH_TABLE.length - 1];
    };
    // #endregion
    
    // #region ==================== 生成一条完整随机鱼 ====================
    /**
     * 生成一条完整的随即鱼对象（包含实际重量）
     * @returns {Object} 鱼对象：{name, rarity, weight, ... 其他属性 }
     */
    const generateRandomFish = () => {
        const baseFish = selectRandomFishType();

        // 生成重量（保留两位小数）
        const weight = Number(
            getRandomInRange({
                min: baseFish.weightMin,
                max: baseFish.weightMax
            }).toFixed(2)
        );

        return {
            name: getFishName(baseFish.name),
            rarity: baseFish.rarity,
            weight: weight,
            sinkTimeMin: baseFish.sinkTimeMin,
            sinkTimeMax: baseFish.sinkTimeMax,
            difficulty: baseFish.difficulty,
            scoreUpSpeed: baseFish.scoreUpSpeed,
            scoreDownSpeed: baseFish.scoreDownSpeed
        };
    };
    // #endregion
    
    // 暴露统一接口
    window.HappyFishingFish = {
        generateRandomFish
    };

    console.log('HappyFishingFish 模块已加载');
})()