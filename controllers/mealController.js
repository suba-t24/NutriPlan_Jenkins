const Meal = require('../models/meals');
const User = require('../models/user');
const WeeklyMealPlan = require('../models/weeklyMealPlan');
const { calculateBMR, adjustCalories } = require('../utils/calculation');

function sumNutrients(meals) {
  let totalProtein = 0, totalFat = 0, totalCarbs = 0;

  meals.forEach(meal => {
    const parseGrams = val => parseFloat(val.replace('g', '').trim()) || 0;
    totalProtein += parseGrams(meal.nutrients?.protein || "0g");
    totalFat += parseGrams(meal.nutrients?.fat || "0g");
    totalCarbs += parseGrams(meal.nutrients?.carbs || "0g");
  });

  return {
    protein: `${totalProtein}g`,
    fat: `${totalFat}g`,
    carbs: `${totalCarbs}g`
  };
}

async function createWeeklyPlan(user, excludeMealIds = [], daysCount = 7) {
  const bmr = calculateBMR(user);
  const targetCalories = adjustCalories(bmr, user.goal, user.activityLevel);

  if (!targetCalories || isNaN(targetCalories)) {
    throw new Error('Invalid target calories calculated for user.');
  }

  const dailyCalorieTarget = targetCalories / user.mealsPerDay;
  if (!dailyCalorieTarget || isNaN(dailyCalorieTarget)) {
    throw new Error('Invalid daily calorie target.');
  }

  const baseMargin = 150;
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIndex = new Date().getDay();
  const sortedDays = [...daysOfWeek.slice(todayIndex), ...daysOfWeek.slice(0, todayIndex)];

  const weeklyPlan = [];
  const recentDaysMeals = [];

  for (let i = 0; i < daysCount; i++) {
    const day = sortedDays[i];

    const exclusionList = [...recentDaysMeals.flat(), ...excludeMealIds];

    let query = {
      diet: user.dietType,
      allergies: { $nin: user.allergies },
      calories: {
        $lte: dailyCalorieTarget + baseMargin,
        $gte: dailyCalorieTarget - baseMargin
      },
      _id: { $nin: exclusionList }
    };

    let meals = await Meal.find(query).limit(user.mealsPerDay);

    if (meals.length < user.mealsPerDay) {
      const fallbackQuery = {
        diet: user.dietType,
        calories: {
          $lte: dailyCalorieTarget + 200,
          $gte: dailyCalorieTarget - 200
        },
        _id: { $nin: exclusionList }
      };
      meals = await Meal.find(fallbackQuery).limit(user.mealsPerDay);
    }

    const todaysMealIds = meals.map(meal => meal._id.toString());

    recentDaysMeals.push(todaysMealIds);
    if (recentDaysMeals.length > 2) {
      recentDaysMeals.shift();
    }

    const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const totalNutrients = sumNutrients(meals);

    weeklyPlan.push({
      day,
      meals,
      totalCalories,
      totalNutrients
    });
  }

  return { weeklyPlan, targetCalories };
}


exports.generateMealPlan = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email }).exec();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { weeklyPlan, targetCalories } = await createWeeklyPlan(user);

    const savedPlan = new WeeklyMealPlan({
      userEmail: user.email,
      dailyPlans: weeklyPlan,
      totalCaloriesPerDay: targetCalories
    });

    await savedPlan.save();
    res.json({ message: 'Weekly meal plan generated', weeklyMealPlan: savedPlan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to generate weekly meal plan', error: error.message });
  }
};

exports.regenerateMealPlan = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email }).exec();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const previousPlan = await WeeklyMealPlan.findOne({ userEmail: user.email });
    const previousMealIds = previousPlan ? previousPlan.dailyPlans.flatMap(day => day.meals.map(m => m._id.toString())) : [];

    await WeeklyMealPlan.deleteMany({ userEmail: user.email });

    const { weeklyPlan, targetCalories } = await createWeeklyPlan(user, previousMealIds);

    const savedPlan = new WeeklyMealPlan({
      userEmail: user.email,
      dailyPlans: weeklyPlan,
      totalCaloriesPerDay: targetCalories
    });

    await savedPlan.save();
    res.json({ message: 'Weekly meal plan regenerated', weeklyMealPlan: savedPlan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to regenerate meal plan', error: error.message });
  }
};
